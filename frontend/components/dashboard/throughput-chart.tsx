import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThroughputPoint } from "@/types/metrics";

interface ThroughputChartProps {
  data: ThroughputPoint[];
  isLoading: boolean;
}

export default function ThroughputChart({
  data,
  isLoading,
}: ThroughputChartProps) {
  return (
    <Card className="rounded-2xl p-6 bg-white shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Throughput (Mbps) — theo thời gian
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number | string) =>
                `${Number(value).toFixed(2)} Mbps`
              }
            />
            <ReferenceLine
              y={100}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{
                value: "100 Mbps Threshold",
                position: "right",
                fill: "#ef4444",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="throughput"
              stroke="#22c55e"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
