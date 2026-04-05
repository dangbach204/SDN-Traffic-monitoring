import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const API = "http://localhost:8000"; // đổi thành IP thực của backend
const POLL_MS = 5000;

function StatCard({ label, value, unit, sub, color }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "1px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160,
      borderTop: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>
        {value ?? "—"}<span style={{ fontSize: 14, marginLeft: 4, color: "var(--color-text-secondary)" }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "1px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "16px 20px", marginBottom: 16
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: "var(--color-text-primary)" }}>{title}</div>
      {children}
    </div>
  );
}

const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`;
};

// Mock data cho demo khi không có backend thật
function mockThroughput(n = 20) {
  return Array.from({ length: n }, (_, i) => ({
    timestamp: new Date(Date.now() - (n - i) * 10000).toISOString(),
    throughput_mbps: 50 + Math.random() * 20 - 5 + Math.sin(i * 0.5) * 8,
  }));
}
function mockJitter(n = 20) {
  return Array.from({ length: n }, (_, i) => ({
    timestamp: new Date(Date.now() - (n - i) * 10000).toISOString(),
    jitter_ms: 0.5 + Math.random() * 1.5 + Math.abs(Math.sin(i * 0.7)) * 1.2,
    packet_loss_pct: Math.random() * 0.5,
  }));
}

export default function App() {
  const [throughput, setThroughput] = useState(mockThroughput());
  const [jitter,     setJitter]     = useState(mockJitter());
  const [summary,    setSummary]    = useState(null);
  const [topology,   setTopology]   = useState("single");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connected,  setConnected]  = useState(false); // false = dùng mock data

  const fetchData = useCallback(async () => {
    try {
      const [tRes, jRes, sRes] = await Promise.all([
        fetch(`${API}/metrics/throughput?limit=60`),
        fetch(`${API}/metrics/jitter?topology=${topology}&limit=60`),
        fetch(`${API}/metrics/summary`),
      ]);
      if (!tRes.ok) throw new Error("backend offline");
      setThroughput(await tRes.json());
      setJitter(await jRes.json());
      setSummary(await sRes.json());
      setConnected(true);
    } catch {
      // backend chưa chạy → dùng mock data rolling
      setThroughput(prev => {
        const next = [...prev.slice(1), {
          timestamp: new Date().toISOString(),
          throughput_mbps: 50 + Math.random() * 20 - 5 + Math.sin(Date.now() / 5000) * 8,
        }];
        return next;
      });
      setJitter(prev => {
        const next = [...prev.slice(1), {
          timestamp: new Date().toISOString(),
          jitter_ms: 0.5 + Math.random() * 1.5,
          packet_loss_pct: Math.random() * 0.5,
        }];
        return next;
      });
      setConnected(false);
    }
    setLastUpdate(new Date());
  }, [topology]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const avgTP = throughput.length
    ? (throughput.reduce((s, d) => s + d.throughput_mbps, 0) / throughput.length).toFixed(2)
    : "—";
  const maxTP = throughput.length
    ? Math.max(...throughput.map(d => d.throughput_mbps)).toFixed(2)
    : "—";
  const avgJ = jitter.length
    ? (jitter.reduce((s, d) => s + d.jitter_ms, 0) / jitter.length).toFixed(3)
    : "—";
  const maxJ = jitter.length
    ? Math.max(...jitter.map(d => d.jitter_ms)).toFixed(3)
    : "—";

  const topoOptions = ["single", "linear", "tree"];

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
            SDN Network Monitor
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
            Ryu Controller · Mininet · FastAPI · PostgreSQL
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: connected ? "#1D9E75" : "#D85A30"
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: connected ? "#1D9E75" : "#D85A30",
              display: "inline-block"
            }}/>
            {connected ? "Connected" : "Mock data (backend offline)"}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Topology selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {topoOptions.map(t => (
          <button key={t} onClick={() => setTopology(t)} style={{
            padding: "6px 16px", borderRadius: 6, border: "1px solid var(--color-border-secondary)",
            cursor: "pointer", fontSize: 13, fontWeight: topology === t ? 500 : 400,
            background: topology === t ? "var(--color-background-info)" : "var(--color-background-primary)",
            color: topology === t ? "var(--color-text-info)" : "var(--color-text-secondary)",
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-tertiary)", alignSelf: "center" }}>
          Topology: <strong style={{ color: "var(--color-text-primary)" }}>{topology}</strong>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard label="Avg Throughput" value={summary?.avg_throughput_mbps ?? avgTP} unit="Mbps" sub="PortStats từ Ryu" color="#1D9E75" />
        <StatCard label="Max Throughput" value={summary?.max_throughput_mbps ?? maxTP} unit="Mbps" sub="Peak trong session" color="#378ADD" />
        <StatCard label="Avg Jitter" value={summary?.avg_jitter_ms ?? avgJ} unit="ms" sub="UDP · iperf3" color="#EF9F27" />
        <StatCard label="Max Jitter" value={summary?.max_jitter_ms ?? maxJ} unit="ms" sub="Worst case" color="#D85A30" />
      </div>

      {/* Throughput chart */}
      <ChartCard title="Throughput (Mbps) — theo thời gian">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={throughput} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
            <XAxis dataKey="timestamp" tickFormatter={fmtTime} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit=" Mbps" />
            <Tooltip
              formatter={(v) => [`${v.toFixed(2)} Mbps`, "Throughput"]}
              labelFormatter={fmtTime}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <ReferenceLine y={100} stroke="#E24B4A" strokeDasharray="4 2" label={{ value: "100 Mbps max", position: "right", fontSize: 10 }} />
            <Line type="monotone" dataKey="throughput_mbps" stroke="#1D9E75" strokeWidth={2} dot={false} name="Throughput" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Jitter chart */}
      <ChartCard title="Jitter (ms) — UDP packet delay variance">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={jitter} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
            <XAxis dataKey="timestamp" tickFormatter={fmtTime} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" ms" />
            <Tooltip
              formatter={(v, n) => [
                n === "jitter_ms" ? `${v.toFixed(3)} ms` : `${v.toFixed(2)}%`,
                n === "jitter_ms" ? "Jitter" : "Packet loss"
              ]}
              labelFormatter={fmtTime}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="jitter_ms" stroke="#EF9F27" strokeWidth={2} dot={false} name="Jitter (ms)" />
            <Line type="monotone" dataKey="packet_loss_pct" stroke="#E24B4A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Packet loss (%)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", marginTop: 8 }}>
        Polling mỗi {POLL_MS / 1000}s · Dữ liệu từ Ryu PortStats + iperf3 UDP · {topology} topology · 100 Mbps links · 1ms delay
      </div>
    </div>
  );
}
