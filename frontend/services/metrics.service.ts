import { API_ENDPOINTS } from "@/constants/api-endpoint";
import axiosInstance from "@/lib/axios";
import type {
  DashboardStats,
  JitterPoint,
  MetricsApiPoint,
  ThroughputPoint,
  Topology,
} from "@/types/metrics";

const withTopology = (endpoint: string, topology: Topology) =>
  `${endpoint}?topology=${encodeURIComponent(topology)}`;

export async function getMetrics(
  topology: Topology,
): Promise<MetricsApiPoint[]> {
  try {
    return await axiosInstance.get<MetricsApiPoint[], MetricsApiPoint[]>(
      withTopology(API_ENDPOINTS.METRICS, topology),
    );
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    throw new Error("Unable to load metrics data");
  }
}

export async function getThroughput(
  topology: Topology,
): Promise<ThroughputPoint[]> {
  const metrics = await getMetrics(topology);
  return metrics.map((point) => ({
    time: point.time,
    throughput: point.throughput,
  }));
}

export async function getJitter(topology: Topology): Promise<JitterPoint[]> {
  const metrics = await getMetrics(topology);
  return metrics.map((point) => ({
    time: point.time,
    jitter: point.jitter,
    packetLoss: point.packetLoss,
  }));
}

export async function getStats(topology: Topology): Promise<DashboardStats> {
  try {
    return await axiosInstance.get<DashboardStats, DashboardStats>(
      withTopology(API_ENDPOINTS.STATS, topology),
    );
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    throw new Error("Unable to load statistics data");
  }
}
