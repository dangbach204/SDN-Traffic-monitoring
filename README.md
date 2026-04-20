# Command lines
## You need to start ryu first than run your topology
### starting ryu: ryu-manager monitor_push.py --observe-links --ofp-tcp-listen-port 6653
### starting mininet topology: sudo python3 topology.py
### Gia su h2 làm server, h1 làm client:
- mininet> h2 iperf -s -u &
- mininet> h1 iperf -u -c 10.0.0.2 -b 10M