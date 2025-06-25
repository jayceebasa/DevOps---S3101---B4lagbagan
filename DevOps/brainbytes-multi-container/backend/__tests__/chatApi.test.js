const request = require('supertest');
const mongoose = require('mongoose'); // Import mongoose to check connection
const app = require('../server');

describe(
  'Chat API',
  () => {
    beforeAll(
      async () => {
        // Wait for the MongoDB connection to be established
        await new Promise((resolve) => {
          const checkConnection = () => {
            if (mongoose.connection.readyState === 1) {
              resolve();
            } else {
              setTimeout(checkConnection, 500);
            }
          };
          checkConnection();
        });
      },
      20000 // Set timeout for the beforeAll hook to 20 seconds
    );

    test(
      'POST /api/chat/send returns correct response',
      async () => {
        const response = await request(app)
          .post('/api/chat/send')
          .send({
            message: 'Hello AI',
            sessionId: 'test-session',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('userMessage');
        expect(response.body).toHaveProperty('aiMessage');
        expect(response.body.userMessage.text).toBe('Hello AI');
        expect(response.body.aiMessage).toBeDefined();
      },
      20000 // Set timeout to 20 seconds
    );

    test(
      'GET /api/chat/history/:sessionId returns messages',
      async () => {
        const response = await request(app).get('/api/chat/history/test-session');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('messages');
        expect(Array.isArray(response.body.messages)).toBe(true);
      },
      20000 // Set timeout to 20 seconds
    );

    test(
      'POST /api/chat/send with invalid data returns 400',
      async () => {
        const response = await request(app).post('/api/chat/send').send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      },
      20000 // Set timeout to 20 seconds
    );
  },
  30000 // Set timeout for the entire describe block to 30 seconds
);
