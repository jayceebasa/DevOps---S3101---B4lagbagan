const puppeteer = require("puppeteer");

describe("Frontend User Interaction Simulation", () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto("http://localhost:3001"); // Ensure this matches your frontend URL
  });

  afterAll(async () => {
    await browser.close();
  });

  it("should load the homepage and display the welcome message", async () => {
    await page.waitForSelector("h1", { timeout: 10000 }); // Wait for the header element
    const welcomeMessage = await page.$eval("h1", (el) => el.textContent);
    expect(welcomeMessage).toContain("BrainBytes AI Tutor");
  }, 15000); // Set Jest timeout to 15 seconds

  it("should send a message and receive an AI response", async () => {
    await page.waitForSelector("input[type='text']", { timeout: 10000 }); // Wait for the input field
    await page.type("input[type='text']", "What is the capital of France?");
    await page.click("button[type='submit']");

    // Add a delay to allow the AI to respond
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds

    await page.waitForSelector(".ai", { timeout: 10000 }); // Wait for AI response
    const aiResponse = await page.$eval(".ai .message-content", (el) => el.textContent);
    expect(aiResponse).toMatch(/The capital of France is Paris/i); // Check for partial match
  }, 20000); // Set Jest timeout to 20 seconds

  it("should persist chat history after reload", async () => {
    await page.reload();
    await page.waitForSelector(".message-content", { timeout: 10000 }); // Wait for messages to load
    const messages = await page.$$eval(".message-content", (elements) =>
      elements.map((el) => el.textContent)
    );
    expect(messages).toContain("What is the capital of France?");
    expect(messages.some((msg) => /The capital of France is Paris/i.test(msg))).toBe(true); // Check for partial match in chat history
  }, 15000); // Set Jest timeout to 15 seconds
});