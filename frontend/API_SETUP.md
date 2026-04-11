# SDN Network Monitoring Dashboard - API Integration

This dashboard fetches real data from a backend API at `http://localhost:8000`.

## Setup Instructions

### Option 1: Use the Sample Backend Server (for testing)

We've included a sample backend server that generates realistic monitoring data.

#### Requirements
- Node.js installed

#### Steps

1. **Start the backend server** (in a separate terminal):
   ```bash
   node scripts/sample-backend.js
   ```

   You should see:
   ```
   ✓ Backend server running at http://localhost:8000
     - GET /api/metrics?topology=single|linear|tree
     - GET /api/stats?topology=single|linear|tree
   ```

2. **Start the Next.js frontend** (in your project directory):
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Open the dashboard**:
   - Navigate to `http://localhost:3000`
   - The dashboard will automatically fetch data from the backend
   - Data updates every 5 seconds
   - Switch between topologies (Single, Linear, Tree) to see different metric patterns

### Option 2: Use Your Own Backend API

If you have an existing backend API, ensure it implements these endpoints:

#### `GET /api/metrics?topology={topology}`

Returns an array of the last 50 data points:

```json
[
  {
    "time": "14:23:45",
    "throughput": 92.34,
    "jitter": 7.21,
    "packetLoss": 0.12
  },
  ...
]
```

**Parameters:**
- `topology`: `single`, `linear`, or `tree` (optional, defaults to `single`)

**Response fields:**
- `time`: Time in HH:MM:SS format
- `throughput`: Network throughput in Mbps
- `jitter`: Packet delay variance in milliseconds
- `packetLoss`: Packet loss percentage

#### `GET /api/stats?topology={topology}`

Returns aggregated statistics:

```json
{
  "avgThroughput": 88.45,
  "maxThroughput": 105.23,
  "avgJitter": 8.91,
  "maxJitter": 23.45
}
```

**Parameters:**
- `topology`: `single`, `linear`, or `tree` (optional, defaults to `single`)

**Response fields:**
- `avgThroughput`: Average throughput in Mbps
- `maxThroughput`: Maximum throughput in Mbps
- `avgJitter`: Average jitter in milliseconds
- `maxJitter`: Maximum jitter in milliseconds

## CORS Configuration

Your backend API must support CORS requests from the frontend domain. The sample backend allows all origins.

If you're using your own backend, make sure to enable CORS:

```
Access-Control-Allow-Origin: * (or your frontend URL)
Access-Control-Allow-Methods: GET
```

## Data Refresh Rate

The dashboard polls the API every 5 seconds to fetch fresh data. This is configured in `hooks/use-dashboard-data.ts`:

```typescript
refreshInterval: 5000, // milliseconds
```

To change the refresh rate, edit the `refreshInterval` value.

## Troubleshooting

### "Connection Error" Message

If you see a connection error:
1. Check that the backend server is running at `http://localhost:8000`
2. Verify the API endpoints are correct
3. Check the browser console for detailed error messages
4. Make sure CORS is enabled on your backend

### No Data Showing

- Check that the `/api/metrics` endpoint returns data in the correct format
- Verify the `time`, `throughput`, `jitter`, and `packetLoss` fields are present
- Check the Network tab in browser DevTools to see the actual API responses

## Files

- `app/page.tsx` - Main dashboard page
- `components/dashboard/stat-card.tsx` - Statistics card component
- `components/dashboard/throughput-chart.tsx` - Throughput chart component
- `components/dashboard/jitter-chart.tsx` - Jitter chart component
- `hooks/use-dashboard-data.ts` - SWR hook for data fetching
- `scripts/sample-backend.js` - Sample backend server (for testing)
