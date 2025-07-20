
const client = require('prom-client');
const express = require('express');
const register = new client.Registry();

// For counting logged-in users
const path = require('path');
const mongoose = require('mongoose');
let Message;
try {
  // Dynamically require Message model if mongoose is available
  Message = require(path.join(__dirname, '../models/Message'));
} catch (e) {
  // If not available, skip
}

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

// Custom metric 1: Counter for number of messages per subject
const messagesPerSubjectCounter = new client.Counter({
  name: 'brainbytes_messages_per_subject_total',
  help: 'Total number of messages per subject',
  labelNames: ['subject'],
  registers: [register]
});
function incrementMessagesPerSubject(subject) {
  messagesPerSubjectCounter.inc({ subject });
}

// Filipino-specific metric 1: Histogram for mobile response time (simulate mobile clients)
const mobileResponseTimeHistogram = new client.Histogram({
  name: 'brainbytes_mobile_response_time_seconds',
  help: 'Histogram of response times for mobile clients in seconds',
  buckets: [0.2, 0.5, 1, 2, 5, 10],
  registers: [register]
});
function observeMobileResponseTime(seconds) {
  mobileResponseTimeHistogram.observe(seconds);
}

// Filipino-specific metric 2: Counter for data usage (bytes sent/received)
const dataUsageCounter = new client.Counter({
  name: 'brainbytes_data_usage_bytes_total',
  help: 'Total data usage in bytes (sent/received)',
  labelNames: ['direction', 'clientType'], // direction: sent/received, clientType: mobile/desktop
  registers: [register]
});
function incrementDataUsage(bytes, direction = 'sent', clientType = 'mobile') {
  dataUsageCounter.inc({ direction, clientType }, bytes);
}

// Filipino-specific metric 3: Gauge for intermittent connectivity events
const intermittentConnectivityGauge = new client.Gauge({
  name: 'brainbytes_intermittent_connectivity_events',
  help: 'Current number of detected intermittent connectivity events (mobile)',
  registers: [register]
});
function setIntermittentConnectivityEvents(count) {
  intermittentConnectivityGauge.set(count);
}

// Custom metric 2: Histogram for AI response time
const aiResponseTimeHistogram = new client.Histogram({
  name: 'brainbytes_ai_response_time_seconds',
  help: 'Histogram of AI response times in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});
function observeAIResponseTime(seconds) {
  aiResponseTimeHistogram.observe(seconds);
}

// Custom metric 3: Gauge for daily active users (unique userEmails in last 24h)
const dailyActiveUsersGauge = new client.Gauge({
  name: 'brainbytes_daily_active_users',
  help: 'Number of unique user emails who sent a message in the last 24 hours',
  registers: [register]
});
async function updateDailyActiveUsersGauge() {
  if (!Message || !mongoose.connection.readyState) return;
  const oneDayAgo = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const uniqueEmails = await Message.distinct('userEmail', {
    createdAt: { $gte: oneDayAgo }
  });
  dailyActiveUsersGauge.set(uniqueEmails.length);
}

const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
metricsApp.listen(9080, () => {
  console.log('Metrics server listening on port 9080');
});

function estimateSize(str) {
  return Buffer.byteLength(str || '', 'utf8');
}

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  let reqSize = 0;
  let resSize = 0;
  // Estimate request size (body + headers)
  try {
    reqSize = estimateSize(JSON.stringify(req.body || {})) + estimateSize(JSON.stringify(req.headers || {}));
  } catch (e) {
    reqSize = 0;
  }
  // Capture response size
  const originalSend = res.send;
  res.send = function (body) {
    try {
      resSize = estimateSize(body) + estimateSize(JSON.stringify(res.getHeaders ? res.getHeaders() : {}));
    } catch (e) {
      resSize = 0;
    }
    return originalSend.apply(this, arguments);
  };
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
    // Filipino-specific: Data usage tracking
    const clientType = req.headers['x-client-type'] || 'desktop';
    if (module.exports.incrementDataUsage) {
      module.exports.incrementDataUsage(reqSize, 'received', clientType);
      module.exports.incrementDataUsage(resSize, 'sent', clientType);
    }
    // Filipino-specific: Mobile response time
    if (clientType === 'mobile' && module.exports.observeMobileResponseTime) {
      module.exports.observeMobileResponseTime(duration);
    }
  });
  next();
}

// Increment AI responses

function incrementActiveSessions() { activeSessionsGauge.inc(); }
function decrementActiveSessions() { activeSessionsGauge.dec(); }

function setActiveSessions(count) { activeSessionsGauge.set(count); }

// Helper: Set gauge to number of unique userEmails (active users) in last 2 hours
async function updateActiveUsersGauge() {
  if (!Message || !mongoose.connection.readyState) return;
  const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2);
  const uniqueUsers = await Message.distinct('userEmail', {
    isUser: true,
    createdAt: { $gte: twoHoursAgo }
  });
  activeSessionsGauge.set(uniqueUsers.length);
}

module.exports = {
  metricsMiddleware,
  incrementActiveSessions,
  decrementActiveSessions,
  setActiveSessions,
  updateActiveUsersGauge,
  incrementMessagesPerSubject,
  observeAIResponseTime,
  updateDailyActiveUsersGauge,
  // Filipino-specific
  observeMobileResponseTime,
  incrementDataUsage,
  setIntermittentConnectivityEvents
};