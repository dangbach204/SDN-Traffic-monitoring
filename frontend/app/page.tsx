"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/stat-card";
import ThroughputChart from "@/components/dashboard/throughput-chart";
import JitterChart from "@/components/dashboard/jitter-chart";
import api from "@/lib/axios";
import type {
  DashboardStats,
  JitterPoint,
  JitterResponse,
  ThroughputPoint,
  ThroughputResponse,
  Topology,
} from "@/types/metrics";

const EMPTY_STATS: DashboardStats = {
  avgThroughput: 0,
  maxThroughput: 0,
  avgJitter: 0,
  maxJitter: 0,
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-GB", { hour12: false });
};

export default function Home() {
  const [topology, setTopology] = useState<Topology>("single");
  const [throughputData, setThroughputData] = useState<ThroughputPoint[]>([]);
  const [jitterData, setJitterData] = useState<JitterPoint[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchMetrics = useCallback(async (selectedTopology: Topology) => {
    try {
      const [throughputResponse, jitterResponse] = await Promise.all([
        api.get<ThroughputResponse[]>("/metrics/throughput", {
          params: { topology: selectedTopology },
        }),
        api.get<JitterResponse[]>("/metrics/jitter", {
          params: { topology: selectedTopology },
        }),
      ]);

      const nextThroughputData = throughputResponse.data
        .map((point) => ({
          time: formatTime(point.timestamp),
          throughput: point.throughput_mbps,
        }))
        .slice(-30);

      const nextJitterData = jitterResponse.data
        .map((point) => ({
          time: formatTime(point.timestamp),
          jitter: point.jitter_ms,
          packetLoss: point.packet_loss_pct,
        }))
        .slice(-30);

      setThroughputData(nextThroughputData);
      setJitterData(nextJitterData);

      const throughputValues = nextThroughputData.map(
        (point) => point.throughput,
      );
      const jitterValues = nextJitterData.map((point) => point.jitter);

      const avgThroughput =
        throughputValues.length > 0
          ? throughputValues.reduce((sum, value) => sum + value, 0) /
            throughputValues.length
          : 0;
      const maxThroughput =
        throughputValues.length > 0 ? Math.max(...throughputValues) : 0;
      const avgJitter =
        jitterValues.length > 0
          ? jitterValues.reduce((sum, value) => sum + value, 0) /
            jitterValues.length
          : 0;
      const maxJitter = jitterValues.length > 0 ? Math.max(...jitterValues) : 0;

      setStats({ avgThroughput, maxThroughput, avgJitter, maxJitter });
    } catch (err) {
      console.log("Failed to fetch dashboard metrics", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeTopology = async (type: string) => {
    if (type !== "single" && type !== "linear" && type !== "tree") {
      return;
    }

    const selectedTopology = type as Topology;

    try {
      setIsSwitching(true);
      await api.post("/control/topology", { name: selectedTopology });
      setTopology(selectedTopology);
      await fetchMetrics(selectedTopology);
    } catch (err) {
      console.log("Failed to change topology", err);
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchMetrics(topology);
    const intervalId = setInterval(() => fetchMetrics(topology), 300000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchMetrics, topology]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Network Monitoring
            </h1>
            <p className="text-gray-600 mt-1">
              SDN Real-time Performance Dashboard
            </p>
          </div>
          <Badge variant="outline" className="h-fit">
            Topology: {topology}
          </Badge>
        </div>

        {/* Topology Switcher */}
        <div className="mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => changeTopology("single")}
              disabled={isSwitching}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "single"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {isSwitching ? "Switching..." : "Single"}
            </button>
            <button
              onClick={() => changeTopology("linear")}
              disabled={isSwitching}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "linear"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {isSwitching ? "Switching..." : "Linear"}
            </button>
            <button
              onClick={() => changeTopology("tree")}
              disabled={isSwitching}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "tree"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {isSwitching ? "Switching..." : "Tree"}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Avg Throughput"
            value={isLoading ? "-" : (stats?.avgThroughput?.toFixed(2) ?? "-")}
            unit="Mbps"
            borderColor="border-green-500"
          />
          <StatCard
            label="Max Throughput"
            value={isLoading ? "-" : (stats?.maxThroughput?.toFixed(2) ?? "-")}
            unit="Mbps"
            borderColor="border-blue-500"
          />
          <StatCard
            label="Avg Jitter"
            value={isLoading ? "-" : (stats?.avgJitter?.toFixed(2) ?? "-")}
            unit="ms"
            borderColor="border-orange-500"
          />
          <StatCard
            label="Max Jitter"
            value={isLoading ? "-" : (stats?.maxJitter?.toFixed(2) ?? "-")}
            unit="ms"
            borderColor="border-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThroughputChart data={throughputData} isLoading={isLoading} />
          <JitterChart data={jitterData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
