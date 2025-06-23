const request = require('supertest');
const app = require('../app');

describe('Chat API', () => {
  test('POST /api/chat/send returns correct response', async () => {
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
  });

  test('GET /api/chat/history/:sessionId returns messages', async () => {
    const response = await request(app).get('/api/chat/history/test-session');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('messages');
    expect(Array.isArray(response.body.messages)).toBe(true);
  });

  test('POST /api/chat/send with invalid data returns 400', async () => {
    const response = await request(app).post('/api/chat/send').send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});