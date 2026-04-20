from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import *
from ryu.ofproto import ofproto_v1_3
from ryu.lib import hub
from ryu.lib.packet import packet, ethernet, ether_types
from ryu.app.wsgi import ControllerBase, WSGIApplication, route

import time
import json
from webob import Response

LINK_CAPACITY = 50  # Mbps
POLL_INTERVAL = 5

simple_monitor_instance_name = 'monitor_app'


class SimpleMonitor(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    _CONTEXTS = {'wsgi': WSGIApplication}

    def __init__(self, *args, **kwargs):
        wsgi = kwargs['wsgi']
        super().__init__(*args, **kwargs)

        self.mac_to_port = {}
        self.datapaths = {}
        self.prev = {}
        self.stats = {}

        wsgi.register(StatsController,
                      {simple_monitor_instance_name: self})

        self.monitor_thread = hub.spawn(self._monitor)

    # SWITCH

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features(self, ev):
        dp = ev.msg.datapath
        ofp = dp.ofproto
        parser = dp.ofproto_parser

        match = parser.OFPMatch()
        actions = [parser.OFPActionOutput(
            ofp.OFPP_CONTROLLER,
            ofp.OFPCML_NO_BUFFER
        )]

        self.add_flow(dp, 0, match, actions)

    def add_flow(self, dp, priority, match, actions):
        parser = dp.ofproto_parser
        ofp = dp.ofproto

        inst = [parser.OFPInstructionActions(
            ofp.OFPIT_APPLY_ACTIONS, actions)]

        mod = parser.OFPFlowMod(
            datapath=dp,
            priority=priority,
            match=match,
            instructions=inst
        )
        dp.send_msg(mod)

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def packet_in(self, ev):
        msg = ev.msg
        dp = msg.datapath
        ofp = dp.ofproto
        parser = dp.ofproto_parser
        in_port = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocols(ethernet.ethernet)[0]

        if eth.ethertype == ether_types.ETH_TYPE_LLDP:
            return

        dst = eth.dst
        src = eth.src
        dpid = dp.id

        self.mac_to_port.setdefault(dpid, {})
        self.mac_to_port[dpid][src] = in_port

        if dst in self.mac_to_port[dpid]:
            out_port = self.mac_to_port[dpid][dst]
        else:
            out_port = ofp.OFPP_FLOOD

        actions = [parser.OFPActionOutput(out_port)]

        if out_port != ofp.OFPP_FLOOD:
            match = parser.OFPMatch(
                in_port=in_port,
                eth_dst=dst
            )
            self.add_flow(dp, 1, match, actions)

        out = parser.OFPPacketOut(
            datapath=dp,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=msg.data if msg.buffer_id == ofp.OFP_NO_BUFFER else None
        )
        dp.send_msg(out)

    # MONITOR

    @set_ev_cls(ofp_event.EventOFPStateChange,
                [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def state_change(self, ev):
        dp = ev.datapath
        if ev.state == MAIN_DISPATCHER:
            self.datapaths[dp.id] = dp
        elif ev.state == DEAD_DISPATCHER:
            self.datapaths.pop(dp.id, None)

    def _monitor(self):
        while True:
            for dp in self.datapaths.values():
                self.request_stats(dp)
            hub.sleep(POLL_INTERVAL)

    def request_stats(self, dp):
        parser = dp.ofproto_parser
        req = parser.OFPPortStatsRequest(
            dp, 0, dp.ofproto.OFPP_ANY
        )
        dp.send_msg(req)

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def port_stats(self, ev):
        dpid = ev.msg.datapath.id
        now = time.time()

        self.stats.setdefault(dpid, {})

        for stat in ev.msg.body:
            port = stat.port_no

            if port == ev.msg.datapath.ofproto.OFPP_LOCAL:
                continue

            prev = self.prev.get(dpid, {}).get(port)

            if prev:
                dt = now - prev["ts"]
                if dt == 0:
                    continue

                tx = (stat.tx_bytes - prev["tx"]) * 8 / dt / 1e6
                rx = (stat.rx_bytes - prev["rx"]) * 8 / dt / 1e6

                util = max(tx, rx) / LINK_CAPACITY * 100

                self.stats[dpid][port] = {
                    "tx_mbps": round(tx, 3),
                    "rx_mbps": round(rx, 3),
                    "utilization": round(util, 2)
                }

                self.logger.info(
                    f"dp={dpid} port={port} TX={tx:.2f} RX={rx:.2f} Util={util:.2f}%"
                )

            self.prev.setdefault(dpid, {})[port] = {
                "tx": stat.tx_bytes,
                "rx": stat.rx_bytes,
                "ts": now
            }


# REST API

class StatsController(ControllerBase):
    def __init__(self, req, link, data, **config):
        super().__init__(req, link, data, **config)
        self.app = data[simple_monitor_instance_name]

    @route('stats', '/stats', methods=['GET'])
    def get_stats(self, req, **kwargs):
        return Response(
            content_type='application/json',
            body=json.dumps(self.app.stats).encode('utf-8')
        )

    @route('qos', '/qos/limit', methods=['POST'])
    def limit_bandwidth(self, req, **kwargs):
        data = req.json

        dpid = int(data["dpid"])
        port = int(data["port"])
        rate = int(data["rate"])  # Mbps

        dp = self.app.datapaths.get(dpid)
        if not dp:
            return Response(status=404)

        ofp = dp.ofproto
        parser = dp.ofproto_parser

        meter_id = port  # đơn giản: mỗi port 1 meter

        bands = [
            parser.OFPMeterBandDrop(
                rate=rate * 1000,  # kbps
                burst_size=10
            )
        ]

        meter_mod = parser.OFPMeterMod(
            datapath=dp,
            command=ofp.OFPMC_ADD,
            flags=ofp.OFPMF_KBPS,
            meter_id=meter_id,
            bands=bands
        )

        dp.send_msg(meter_mod)

        # apply meter vào flow
        match = parser.OFPMatch(in_port=port)

        inst = [
            parser.OFPInstructionMeter(meter_id),
            parser.OFPInstructionActions(
                ofp.OFPIT_APPLY_ACTIONS,
                [parser.OFPActionOutput(ofp.OFPP_NORMAL)]
            )
        ]

        mod = parser.OFPFlowMod(
            datapath=dp,
            priority=100,
            match=match,
            instructions=inst
        )

        dp.send_msg(mod)

        return Response(
            content_type='application/json',
            body=json.dumps({"status": "limited"}).encode()
        )