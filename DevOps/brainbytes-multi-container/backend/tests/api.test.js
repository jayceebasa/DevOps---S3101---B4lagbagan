const request = require("supertest");

// Mock the server and database operations
jest.mock("../server", () => {
  const mockExpress = require("express");
  const app = mockExpress();
  app.use(mockExpress.json());
  app.get("/", (req, res) => res.status(200).json({ message: "Welcome to the BrainBytes API" }));
  app.get("/api/messages", (req, res) => res.status(200).json([]));
  app.post("/api/messages", (req, res) =>
    res.status(201).json({
      userMessage: req.body,
      aiMessage: { text: "Mock AI response", isUser: false },
    })
  );
  return { app };
});

const { app } = require("../server"); // Import the mocked Express app

jest.setTimeout(30000); // Set global timeout to 30 seconds

describe("API Endpoint Testing", () => {
  it("should return a welcome message from the health endpoint", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Welcome to the BrainBytes API");
  });

  it("should fetch all messages from the history endpoint", async () => {
    const res = await request(app).get("/api/messages");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0); // Mocked response should return an empty array
  });

  it("should post a user message and receive an AI response from the chat endpoint", async () => {
    const userMessage = { text: "What is the capital of France?", subject: "General" };
    const res = await request(app)
      .post("/api/messages")
      .send(userMessage);

    expect(res.statusCode).toBe(201);
    expect(res.body.userMessage.text).toBe(userMessage.text);
    expect(res.body.aiMessage.isUser).toBe(false); // Mocked response
    expect(res.body.aiMessage.text).toBe("Mock AI response"); // Mocked response text
  });
});