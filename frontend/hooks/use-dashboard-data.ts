import { useMemo } from "react";

import { getMetrics, getStats } from "@/services/metrics.service";
import type {
  DashboardStats,
  JitterPoint,
  MetricsApiPoint,
  ThroughputPoint,
  Topology,
} from "@/types/metrics";
import useSWR from "swr";

const statsFallback: DashboardStats = {
  avgThroughput: 0,
  maxThroughput: 0,
  avgJitter: 0,
  maxJitter: 0,
};

const swrOptions = {
  refreshInterval: 5000,
  dedupingInterval: 2000,
  revalidateOnFocus: false,
};

export default function useDashboardData(topology: Topology) {
  const { data: metricsData, error: metricsError } = useSWR<MetricsApiPoint[]>(
    ["metrics", topology],
    () => getMetrics(topology),
    swrOptions,
  );

  const { data: statsData, error: statsError } = useSWR<DashboardStats>(
    ["stats", topology],
    () => getStats(topology),
    swrOptions,
  );

  const throughputData = useMemo<ThroughputPoint[]>(
    () =>
      (metricsData ?? []).map((point) => ({
        time: point.time,
        throughput: point.throughput,
      })),
    [metricsData],
  );

  const jitterData = useMemo<JitterPoint[]>(
    () =>
      (metricsData ?? []).map((point) => ({
        time: point.time,
        jitter: point.jitter,
        packetLoss: point.packetLoss,
      })),
    [metricsData],
  );

  const isLoading = !metricsData || !statsData;
  const error = metricsError || statsError;
  const stats = statsData ?? statsFallback;

  return {
    stats,
    throughputData,
    jitterData,
    isLoading,
    error,
  };
}
