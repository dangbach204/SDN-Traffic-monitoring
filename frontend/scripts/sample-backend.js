/**
 * Sample Backend Server for SDN Network Monitoring Dashboard
 * 
 * Run this with: node scripts/sample-backend.js
 * The frontend will connect to http://localhost:8000
 * 
 * Endpoints:
 * - GET /api/metrics?topology=single - Returns array of data points with time, throughput, jitter, packetLoss
 * - GET /api/stats?topology=single - Returns stats with avgThroughput, maxThroughput, avgJitter, maxJitter
 */

const http = require('http')

// Generate realistic metric data
function generateMetrics(topology = 'single') {
  const now = new Date()
  const dataPoints = []

  // Generate last 50 data points
  for (let i = 49; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 1000)
    const timeStr = time.toLocaleTimeString('en-US', { hour12: false })

    let throughput, jitter, packetLoss

    if (topology === 'single') {
      // Stable metrics for single topology
      throughput = 85 + Math.random() * 20 // 85-105 Mbps
      jitter = 5 + Math.random() * 8 // 5-13 ms
      packetLoss = Math.random() * 0.5 // 0-0.5%
    } else if (topology === 'linear') {
      // Higher variance for linear topology
      throughput = 70 + Math.random() * 35 // 70-105 Mbps
      jitter = 8 + Math.random() * 15 // 8-23 ms
      packetLoss = Math.random() * 1.5 // 0-1.5%
    } else if (topology === 'tree') {
      // Most variable for tree topology
      throughput = 60 + Math.random() * 45 // 60-105 Mbps
      jitter = 10 + Math.random() * 20 // 10-30 ms
      packetLoss = Math.random() * 3 // 0-3%
    }

    dataPoints.push({
      time: timeStr,
      throughput: Math.round(throughput * 100) / 100,
      jitter: Math.round(jitter * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
    })
  }

  return dataPoints
}

function calculateStats(dataPoints) {
  const throughputs = dataPoints.map((p) => p.throughput)
  const jitters = dataPoints.map((p) => p.jitter)

  return {
    avgThroughput: Math.round((throughputs.reduce((a, b) => a + b) / throughputs.length) * 100) / 100,
    maxThroughput: Math.max(...throughputs),
    avgJitter: Math.round((jitters.reduce((a, b) => a + b) / jitters.length) * 100) / 100,
    maxJitter: Math.max(...jitters),
  }
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname
  const topology = url.searchParams.get('topology') || 'single'

  if (pathname === '/api/metrics') {
    const metrics = generateMetrics(topology)
    res.writeHead(200)
    res.end(JSON.stringify(metrics))
  } else if (pathname === '/api/stats') {
    const metrics = generateMetrics(topology)
    const stats = calculateStats(metrics)
    res.writeHead(200)
    res.end(JSON.stringify(stats))
  } else if (pathname === '/') {
    res.writeHead(200)
    res.end(JSON.stringify({ message: 'SDN Network Monitoring Backend', status: 'ok' }))
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})

const PORT = 8000
server.listen(PORT, () => {
  console.log(`✓ Backend server running at http://localhost:${PORT}`)
  console.log(`  - GET /api/metrics?topology=single|linear|tree`)
  console.log(`  - GET /api/stats?topology=single|linear|tree`)
  console.log(`\nFrontend should connect to http://localhost:${PORT}`)
})
