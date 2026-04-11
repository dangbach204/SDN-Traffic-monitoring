export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const API_ENDPOINTS = {
  METRICS: "/api/metrics",
  STATS: "/api/stats",
} as const;
