"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/stat-card";
import ThroughputChart from "@/components/dashboard/throughput-chart";
import JitterChart from "@/components/dashboard/jitter-chart";
import useDashboardData from "@/hooks/use-dashboard-data";
import { API_BASE_URL } from "@/constants/api-endpoint";
import type { Topology } from "@/types/metrics";

export default function Home() {
  const [topology, setTopology] = useState<Topology>("single");
  const { stats, throughputData, jitterData, isLoading, error } =
    useDashboardData(topology);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Connection Error
          </h1>
          <p className="text-gray-600 mb-4">
            Unable to connect to API at {API_BASE_URL}
          </p>
          <p className="text-sm text-gray-500">
            Make sure the backend server is running.
          </p>
        </div>
      </div>
    );
  }

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
              onClick={() => setTopology("single")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "single"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setTopology("linear")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "linear"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => setTopology("tree")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                topology === "tree"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Tree
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
