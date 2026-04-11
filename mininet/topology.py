#!/usr/bin/env python3
from mininet.net import Mininet
from mininet.node import RemoteController, OVSSwitch
from mininet.link import TCLink
from mininet.topo import Topo
from mininet.log import setLogLevel
from mininet.cli import CLI
import socket
import sys
import time

class SingleTopo(Topo):
    """1 switch — 5 hosts"""
    def build(self):
        sw = self.addSwitch('s1', protocols='OpenFlow13')
        for i in range(1, 6):
            h = self.addHost(f'h{i}',
                             ip=f'10.0.0.{i}/24',
                             mac=f'00:00:00:00:00:{i:02x}')
            self.addLink(h, sw, bw=100, delay='1ms', use_htb=True)

class LinearTopo(Topo):
    """3 switches — 1 host per switch"""
    def build(self):
        switches = [self.addSwitch(f's{i}', protocols='OpenFlow13') for i in range(1, 4)]
        for i in range(len(switches) - 1):
            self.addLink(switches[i], switches[i+1])
        for i, sw in enumerate(switches):
            h = self.addHost(f'h{i+1}', ip=f'10.0.0.{i+1}/24')
            self.addLink(h, sw, bw=100, delay='1ms', use_htb=True)

class TreeTopo(Topo):
    """4 switches tree form — 2 hosts per leaf switch"""
    def build(self):
        s1 = self.addSwitch('s1', protocols='OpenFlow13')  # root
        s2 = self.addSwitch('s2', protocols='OpenFlow13')
        s3 = self.addSwitch('s3', protocols='OpenFlow13')
        s4 = self.addSwitch('s4', protocols='OpenFlow13')
        s5 = self.addSwitch('s5', protocols='OpenFlow13')

        self.addLink(s1, s2)
        self.addLink(s1, s3)
        self.addLink(s2, s4)
        self.addLink(s3, s5)

        hosts = []
        for i in range(1, 9):
            h = self.addHost(f'h{i}', ip=f'10.0.0.{i}/24')
            hosts.append(h)

        # 2 host per leaf switch
        for sw, (h1, h2) in zip([s2, s3, s4, s5],
                                 [(hosts[0], hosts[1]),
                                  (hosts[2], hosts[3]),
                                  (hosts[4], hosts[5]),
                                  (hosts[6], hosts[7])]):
            self.addLink(h1, sw, bw=100, delay='1ms', use_htb=True)
            self.addLink(h2, sw, bw=100, delay='1ms', use_htb=True)

TOPOS = {
    "single": SingleTopo,
    "linear": LinearTopo,
    "tree":   TreeTopo,
}


def controller_is_reachable(ip: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except OSError:
        return False


def wait_for_switches(net: Mininet, timeout: float = 10.0, interval: float = 0.5) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        pending = [sw.name for sw in net.switches if not sw.connected()]
        if not pending:
            return True
        print(f"[mininet] Waiting for controller connection on: {', '.join(pending)}")
        time.sleep(interval)
    return False

def run(topo_type="single"):
    controller_ip = '127.0.0.1'
    controller_port = 6653

    if not controller_is_reachable(controller_ip, controller_port):
        print(
            f"[mininet] Controller is not reachable at {controller_ip}:{controller_port}. "
            "Start Ryu first or verify the port, otherwise all pings will fail."
        )
        return

    topo = TOPOS.get(topo_type, SingleTopo)()
    net  = Mininet(
        topo=topo,
        switch=OVSSwitch,
        link=TCLink,
        controller=None,
        autoSetMacs=True,
    )
    net.addController(
        'c0',
        controller=RemoteController,
        ip=controller_ip,
        port=controller_port
    )
    net.start()
    if not wait_for_switches(net):
        print(
            "[mininet] Switches did not finish connecting to the controller. "
            "Packet loss will stay at 100% until the controller handshake succeeds."
        )
        net.stop()
        return
    print(f"\n[mininet] Topology: {topo_type}")
    print("[mininet] Testing Connection:")
    net.pingAll()
    CLI(net)
    net.stop()

if __name__ == '__main__':
    setLogLevel('info')
    topo_type = sys.argv[1] if len(sys.argv) > 1 else "single"
    run(topo_type)
