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
