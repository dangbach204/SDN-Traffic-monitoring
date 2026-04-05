from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import (
    CONFIG_DISPATCHER, MAIN_DISPATCHER,
    DEAD_DISPATCHER, set_ev_cls
)
from ryu.ofproto import ofproto_v1_3
from ryu.lib import hub
from ryu.lib.packet import packet, ethernet, ether_types
import requests, time

FASTAPI_URL   = "http://127.0.0.1:8000"
POLL_INTERVAL = 10
TOPOLOGY      = "single"  # "single", "linear", "tree"

class SimpleMonitorPush(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.mac_to_port = {}   # {dpid: {mac: port}}
        self.prev_stats  = {}   # {dpid: {port_no: {tx, rx, ts}}}
        self.datapaths   = {}
        self.monitor_thread = hub.spawn(self._monitor_loop)

    # ── L2 Switching ─────────────────────────────────────────────

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def _switch_features_handler(self, ev):
        dp         = ev.msg.datapath
        ofp        = dp.ofproto
        ofp_parser = dp.ofproto_parser

        # Table-miss: send all packets to controller
        match = ofp_parser.OFPMatch()
        actions = [ofp_parser.OFPActionOutput(
            ofp.OFPP_CONTROLLER, ofp.OFPCML_NO_BUFFER
        )]
        self._add_flow(dp, priority=0, match=match, actions=actions)
        self.logger.info(f"[switch] table-miss installed: dpid={dp.id}")

    def _add_flow(self, dp, priority, match, actions, idle_timeout=0):
        ofp        = dp.ofproto
        ofp_parser = dp.ofproto_parser
        inst = [ofp_parser.OFPInstructionActions(
            ofp.OFPIT_APPLY_ACTIONS, actions
        )]
        mod = ofp_parser.OFPFlowMod(
            datapath=dp, priority=priority,
            idle_timeout=idle_timeout,
            match=match, instructions=inst
        )
        dp.send_msg(mod)

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def _packet_in_handler(self, ev):
        """Học MAC và forward packet — giống switching_hub"""
        msg        = ev.msg
        dp         = msg.datapath
        ofp        = dp.ofproto
        ofp_parser = dp.ofproto_parser
        in_port    = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocols(ethernet.ethernet)[0]

        # Bỏ qua LLDP
        if eth.ethertype == ether_types.ETH_TYPE_LLDP:
            return

        dst_mac = eth.dst
        src_mac = eth.src
        dpid    = dp.id

        # Học MAC → port
        self.mac_to_port.setdefault(dpid, {})
        self.mac_to_port[dpid][src_mac] = in_port

        # Tìm out_port
        if dst_mac in self.mac_to_port[dpid]:
            out_port = self.mac_to_port[dpid][dst_mac]
        else:
            out_port = ofp.OFPP_FLOOD

        actions = [ofp_parser.OFPActionOutput(out_port)]

        # Cài flow rule nếu biết đích (tránh flood liên tục)
        if out_port != ofp.OFPP_FLOOD:
            match = ofp_parser.OFPMatch(
                in_port=in_port, eth_dst=dst_mac, eth_src=src_mac
            )
            self._add_flow(dp, priority=1, match=match,
                           actions=actions, idle_timeout=30)

        # Gửi packet ra
        out = ofp_parser.OFPPacketOut(
            datapath=dp,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=msg.data if msg.buffer_id == ofp.OFP_NO_BUFFER else None
        )
        dp.send_msg(out)

    # ── Monitoring ───────────────────────────────────────────────

    @set_ev_cls(ofp_event.EventOFPStateChange,
                [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        dp = ev.datapath
        if ev.state == MAIN_DISPATCHER:
            self.datapaths[dp.id] = dp
            self.logger.info(f"[monitor] Switch connected: dpid={dp.id}")
        elif ev.state == DEAD_DISPATCHER:
            self.datapaths.pop(dp.id, None)
            self.prev_stats.pop(dp.id, None)

    def _monitor_loop(self):
        while True:
            for dp in list(self.datapaths.values()):
                self._request_port_stats(dp)
            hub.sleep(POLL_INTERVAL)

    def _request_port_stats(self, dp):
        ofp        = dp.ofproto
        ofp_parser = dp.ofproto_parser
        req = ofp_parser.OFPPortStatsRequest(dp, 0, ofp.OFPP_ANY)
        dp.send_msg(req)

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        dpid = ev.msg.datapath.id
        now  = time.time()

        for stat in ev.msg.body:
            port_no = stat.port_no
            if port_no == ev.msg.datapath.ofproto.OFPP_LOCAL:
                continue

            prev = self.prev_stats.get(dpid, {}).get(port_no)
            if prev:
                dt = now - prev["ts"]
                if dt <= 0:
                    continue

                throughput = round(
                    (stat.tx_bytes - prev["tx"] +
                     stat.rx_bytes - prev["rx"]) * 8 / dt / 1e6, 3
                )
                self._push({
                    "dpid":            dpid,
                    "port":            port_no,
                    "topology":        TOPOLOGY,
                    "throughput_mbps": throughput,
                    "tx_bytes":        stat.tx_bytes,
                    "rx_bytes":        stat.rx_bytes,
                    "tx_errors":       stat.tx_errors,
                    "rx_errors":       stat.rx_errors,
                })
                self.logger.info(
                    f"[monitor] dpid={dpid} port={port_no} "
                    f"{throughput} Mbps"
                )

            self.prev_stats.setdefault(dpid, {})[port_no] = {
                "ts": now,
                "tx": stat.tx_bytes,
                "rx": stat.rx_bytes,
            }

    def _push(self, payload: dict):
        try:
            requests.post(f"{FASTAPI_URL}/stats/flow",
                          json=payload, timeout=3)
        except requests.exceptions.RequestException as e:
            self.logger.warning(f"[push] {e}")