import { METRICS, STATS } from "@/constants/api-endpoint";
import api from "@/lib/axios";
import type {
  DashboardStats,
  JitterResponse,
  MetricsApiPoint,
  SummaryResponse,
  Topology,
  ThroughputResponse,
} from "@/types/metrics";

const withTopology = (endpoint: string, topology?: Topology) => {
  if (!topology) {
    return endpoint;
  }

  return `${endpoint}?topology=${encodeURIComponent(topology)}`;
};

export const getMetrics = async (
  topology?: Topology,
): Promise<MetricsApiPoint[]> => {
  try {
    const [throughputResponse, jitterResponse] = await Promise.all([
      api.get<ThroughputResponse[]>(withTopology(METRICS.THROUGHPUT, topology)),
      api.get<JitterResponse[]>(withTopology(METRICS.JITTER, topology)),
    ]);

    const throughputByTimestamp = new Map(
      throughputResponse.data.map((point) => [point.timestamp, point]),
    );

    return jitterResponse.data
      .filter((point) => throughputByTimestamp.has(point.timestamp))
      .map((point) => {
        const throughputPoint = throughputByTimestamp.get(point.timestamp)!;

        return {
          time: point.timestamp,
          jitter: point.jitter_ms,
          packetLoss: point.packet_loss_pct,
          throughput: throughputPoint.throughput_mbps,
        };
      });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    throw new Error("Unable to load metrics data");
  }
};

export const getThroughput = async (topology?: Topology) => {
  try {
    const response = await api.get<ThroughputResponse[]>(
      withTopology(METRICS.THROUGHPUT, topology),
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch throughput data:", error);
    throw new Error("Unable to load throughput data");
  }
};

export const getJitter = async (topology?: Topology) => {
  try {
    const response = await api.get<JitterResponse[]>(
      withTopology(METRICS.JITTER, topology),
    );
    return response.data.map((point) => ({
      time: point.timestamp,
      jitter: point.jitter_ms,
      packetLoss: point.packet_loss_pct,
    }));
  } catch (error) {
    console.error("Failed to fetch jitter data:", error);
    throw new Error("Unable to load jitter data");
  }
};

export const getStats = async (
  topology?: Topology,
): Promise<DashboardStats> => {
  try {
    const response = await api.get<SummaryResponse>(
      withTopology(STATS.FLOWS, topology),
    );

    return {
      avgThroughput: response.data.avg_throughput_mbps,
      maxThroughput: response.data.max_throughput_mbps,
      avgJitter: response.data.avg_jitter_ms,
      maxJitter: response.data.max_jitter_ms,
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    throw new Error("Unable to load statistics data");
  }
};
