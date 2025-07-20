
let fetch = global.fetch;
if (!fetch) fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Simulate a pool of users and subjects
const USERS = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`);
const SUBJECTS = ['Math', 'Science', 'History', 'Language', 'Technology', 'General'];

// Simulate peak and quiet periods
function getLoadDelay(hour) {
  // Peak: 8-10am, 7-9pm (faster requests)
  if ((hour >= 8 && hour < 10) || (hour >= 19 && hour < 21)) return Math.random() * 1000 + 300;
  // Quiet: 2-5am (slower requests)
  if (hour >= 2 && hour < 5) return Math.random() * 4000 + 2000;
  // Normal
  return Math.random() * 2000 + 800;
}

function randomUser() {
  return USERS[Math.floor(Math.random() * USERS.length)];
}
function randomSubject() {
  return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
}

function estimateSize(str) {
  // Roughly estimate byte size of a string
  return Buffer.byteLength(str, 'utf8');
}

function randomClientType() {
  return Math.random() < 0.5 ? 'mobile' : 'desktop';
}

async function makeRequest() {
  const clientType = randomClientType();
  const endpoints = [
    {
      path: '/api/messages',
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello AI ' + Math.random().toString(36).substring(2, 7),
        subject: randomSubject(),
        sessionId: 'sim-session-' + Math.floor(Math.random() * 10000),
        userEmail: randomUser()
      }),
      headers: { 'Content-Type': 'application/json' }
    },
    // Simulate error: missing required fields
    {
      path: '/api/messages',
      method: 'POST',
      body: JSON.stringify({ text: '', subject: '', sessionId: '', userEmail: '' }),
      headers: { 'Content-Type': 'application/json' }
    },
    // Simulate GET all messages
    {
      path: '/api/messages',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    },
    // Simulate GET all users
    {
      path: '/api/users',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  ];

  // 80% normal, 20% error
  const isError = Math.random() < 0.2;
  const endpoint = isError ? endpoints[1] : endpoints[Math.floor(Math.random() * endpoints.length)];

  // Add client type header
  endpoint.headers['X-Client-Type'] = clientType;

  // Estimate data usage (request size)
  const reqSize = estimateSize(endpoint.body || '') + estimateSize(JSON.stringify(endpoint.headers));

  try {
    const response = await fetch(`http://localhost:3000${endpoint.path}`, {
      method: endpoint.method,
      headers: endpoint.headers,
      body: endpoint.body
    });
    // Estimate response size (roughly, just status and headers)
    const resSize = estimateSize(JSON.stringify(response.headers.raw ? response.headers.raw() : {})) + 20;
    console.log(`[${new Date().toISOString()}] ${endpoint.method} ${endpoint.path}: ${response.status} | clientType=${clientType} | reqBytes=${reqSize} | resBytes=${resSize}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error with ${endpoint.method} ${endpoint.path}:`, error.message);
  }
}

async function simulateTraffic() {
  while (true) {
    await makeRequest();
    const hour = new Date().getHours();
    const delay = getLoadDelay(hour);
    await new Promise(r => setTimeout(r, delay));
  }
}

simulateTraffic();
