from mininet.net import Mininet
from mininet.node import RemoteController, OVSSwitch
from mininet.link import TCLink
from mininet.topo import Topo
from mininet.log import setLogLevel
from mininet.cli import CLI
import socket
import time
import sys


class ThreeSwitchTopo(Topo):
    """
    3 switches - 12 hosts
    s1: h1-h4
    s2: h5-h8
    s3: h9-h12
    """

    def build(self):
        # switches
        s1 = self.addSwitch('s1', protocols='OpenFlow13')
        s2 = self.addSwitch('s2', protocols='OpenFlow13')
        s3 = self.addSwitch('s3', protocols='OpenFlow13')

        # switch links (50 Mbps)
        self.addLink(s1, s2, bw=50, delay='1ms', use_htb=True)
        self.addLink(s2, s3, bw=50, delay='1ms', use_htb=True)

        # hosts
        host_id = 1
        for sw in [s1, s2, s3]:
            for _ in range(4):
                h = self.addHost(
                    f'h{host_id}',
                    ip=f'10.0.0.{host_id}/24'
                )
                self.addLink(h, sw, bw=50, delay='1ms', use_htb=True)
                host_id += 1


def controller_ready(ip, port):
    try:
        with socket.create_connection((ip, port), timeout=2):
            return True
    except:
        return False


def wait_switch(net, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        if all(sw.connected() for sw in net.switches):
            return True
        print("[mininet] waiting controller...")
        time.sleep(1)
    return False


def run():
    controller_ip = "127.0.0.1"
    controller_port = 6653

    if not controller_ready(controller_ip, controller_port):
        print("Ryu is not running") 
        return

    topo = ThreeSwitchTopo()

    net = Mininet(
        topo=topo,
        switch=OVSSwitch,
        link=TCLink,
        controller=None,
        autoSetMacs=True
    )

    net.addController(
        'c0',
        controller=RemoteController,
        ip=controller_ip,
        port=controller_port
    )

    net.start()

    if not wait_switch(net):
        print("switch failed to connect to controller")
        net.stop()
        return

    print("\n Network started")
    net.pingAll()

    CLI(net)
    net.stop()


if __name__ == '__main__':
    setLogLevel('info')
    run()