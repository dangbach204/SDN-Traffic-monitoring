import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { JitterPoint } from "@/types/metrics";

interface JitterChartProps {
  data: JitterPoint[];
  isLoading: boolean;
}

export default function JitterChart({ data, isLoading }: JitterChartProps) {
  return (
    <Card className="rounded-2xl p-6 bg-white shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Jitter (ms) — UDP packet delay variance
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
                `${Number(value).toFixed(2)}`
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="jitter"
              stroke="#f97316"
              dot={false}
              strokeWidth={2}
              name="Jitter (ms)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="packetLoss"
              stroke="#ef4444"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={2}
              name="Packet Loss (%)"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
