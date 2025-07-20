async function makeRequest() {
  const endpoints = [
    {
      path: '/api/messages',
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello AI',
        subject: 'General',
        sessionId: 'sim-session-' + Math.floor(Math.random() * 10000),
        userEmail: 'simuser' + Math.floor(Math.random() * 5) + '@example.com'
      }),
      headers: { 'Content-Type': 'application/json' }
    }
    // Add more endpoints here if needed
  ];

  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  try {
    const response = await fetch(`http://localhost:3000${randomEndpoint.path}`, {
      method: randomEndpoint.method,
      headers: randomEndpoint.headers,
      body: randomEndpoint.body
    });
    console.log(`Request to ${randomEndpoint.path}: ${response.status}`);
  } catch (error) {
    console.error(`Error with ${randomEndpoint.path}:`, error.message);
  }
}

async function simulateTraffic() {
  while (true) {
    await makeRequest();
    // Wait between 1-5 seconds
    await new Promise(r => setTimeout(r, Math.random() * 4000 + 1000));
  }
}

simulateTraffic();
