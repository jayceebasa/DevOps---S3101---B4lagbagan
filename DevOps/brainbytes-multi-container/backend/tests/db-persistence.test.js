const mongoose = require("mongoose");
const Message = require("../server").Message; // Import the Message model

jest.setTimeout(30000); // Set global timeout to 30 seconds

beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect("mongodb://localhost:27017/brainbytes", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      break;
    } catch (err) {
      console.error("Retrying MongoDB connection...");
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retry
    }
  }
}, 30000);

describe("Database Persistence Testing", () => {
  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds
    let retries = 5;
    while (retries > 0) {
      try {
        await mongoose.connect("mongodb://localhost:27017/brainbytes", {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        break;
      } catch (err) {
        console.error("Retrying MongoDB connection...");
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retry
      }
    }
  }, 30000);

  afterAll(async () => {
    await mongoose.connection.close();
  }, 30000);

  it("should persist data across container restarts", async () => {
    const testMessage = new Message({
      text: "Test message",
      isUser: true,
      subject: "General",
    });
    await testMessage.save();

    await mongoose.disconnect();
    await mongoose.connect("mongodb://localhost:27017/brainbytes", {
      // Use localhost
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const foundMessage = await Message.findOne({ text: "Test message" });
    expect(foundMessage).not.toBeNull();
    expect(foundMessage.text).toBe("Test message");
  });
});
