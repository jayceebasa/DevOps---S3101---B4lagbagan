let fetch = global.fetch;
if (!fetch) fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const USERS = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`);
const SUBJECTS = ['Math', 'Science', 'History', 'Language', 'Technology', 'General'];

function randomUser() { return USERS[Math.floor(Math.random() * USERS.length)]; }
function randomSubject() { return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]; }

async function sendMessage(valid = true) {
  const body = valid
    ? { text: 'Hello AI', subject: randomSubject(), sessionId: 'sim-' + Math.random(), userEmail: randomUser() }
    : { text: '', subject: '', sessionId: '', userEmail: '' };
  await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Scenario 1: High Load
async function highLoadScenario() {
  for (let i = 0; i < 100; i++) {
    await sendMessage(true);
    await new Promise(r => setTimeout(r, 100)); // 10 req/sec
  }
}

// Scenario 2: Error Spike
async function errorSpikeScenario() {
  for (let i = 0; i < 50; i++) {
    await sendMessage(false); // error
    await new Promise(r => setTimeout(r, 200));
  }
}

// Scenario 3: Resource Constraint (slow requests)
async function resourceConstraintScenario() {
  for (let i = 0; i < 20; i++) {
    await sendMessage(true);
    await new Promise(r => setTimeout(r, 5000)); // 1 req/5 sec
  }
}

// CLI to run scenarios
const scenario = process.argv[2];
if (scenario === 'highload') highLoadScenario();
else if (scenario === 'errors') errorSpikeScenario();
else if (scenario === 'slow') resourceConstraintScenario();
else console.log('Usage: node simulate-scenarios.js [highload|errors|slow]');

/*
Scenario Documentation:

1. High Load Scenario (highload):
   - Rapidly sends 100 valid POST /api/messages requests.
   - Expect: brainbytes_messages_per_subject_total increases quickly, AI response time may rise.

2. Error Spike Scenario (errors):
   - Sends 50 invalid POST /api/messages requests (missing fields).
   - Expect: Error logs increase, message metric increases slowly, AI response time may spike if errors cause retries/timeouts.

3. Resource Constraint Scenario (slow):
   - Sends 20 valid POST /api/messages requests, 5 seconds apart.
   - Expect: Lower message rate, AI response time may increase if backend is slow, daily active users may plateau.
*/
