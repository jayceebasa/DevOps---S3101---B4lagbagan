const client = require('prom-client');
const express = require('express');
const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'brainbytes_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'brainbytes_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const activeSessionsGauge = new client.Gauge({
  name: 'brainbytes_active_sessions',
  help: 'Number of active tutoring sessions',
  registers: [register]
});
activeSessionsGauge.set(0);

const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
metricsApp.listen(9080, () => {
  console.log('Metrics server listening on port 9080');
});

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode
    });
    httpRequestDuration.observe({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode
    }, duration);
  });
  next();
}

function incrementActiveSessions() { activeSessionsGauge.inc(); }
function decrementActiveSessions() { activeSessionsGauge.dec(); }

module.exports = {
  metricsMiddleware,
  incrementActiveSessions,
  decrementActiveSessions
};