export type Topology = "single" | "linear" | "tree";

export interface ThroughputPoint {
  time: string;
  throughput: number;
}

export interface JitterPoint {
  time: string;
  jitter: number;
  packetLoss: number;
}

export interface MetricsApiPoint {
  time: string;
  throughput: number;
  jitter: number;
  packetLoss: number;
}

export interface DashboardStats {
  avgThroughput: number;
  maxThroughput: number;
  avgJitter: number;
  maxJitter: number;
}

export interface SummaryResponse {
  avg_throughput_mbps: number;
  max_throughput_mbps: number;
  min_throughput_mbps: number;
  avg_jitter_ms: number;
  max_jitter_ms: number;
}

export interface JitterResponse {
  timestamp: string;
  topology: string;
  throughput_mbps: number;
  jitter_ms: number;
  packet_loss_pct: number;
}

export interface ThroughputResponse {
  timestamp: string;
  dpid: number;
  port: number;
  topology: string;
  throughput_mbps: number;
}