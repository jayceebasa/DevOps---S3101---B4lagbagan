// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const aiService = require("./aiService");

const app = express();
const PORT = process.env.PORT || 3000 || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AI
aiService.initializeAI();

// MongoDB connection
const connectToDatabase = async () => {
  const defaultUri = "mongodb://localhost:27017/brainbytes";
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/brainbytes";

  mongoose.set("bufferTimeoutMS", 30000);
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      serverSelectionTimeoutMS: 60000, // Increase timeout for server selection
      socketTimeoutMS: 60000, // Increase socket timeout
    });
    console.log(`Connected to MongoDB: ${uri}`);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    if (process.env.NODE_ENV !== "test") {
      setTimeout(connectToDatabase, 5000); // Retry if not testing
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  connectToDatabase();
}

// Schemas and Models
const messageSchema = new mongoose.Schema({
  text: String,
  isUser: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  subject: { type: String, default: "General" },
});

const userProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  preferredSubjects: [String],
});

const learningMaterialSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  content: { type: String, required: true },
});

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const UserProfile = mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);
const LearningMaterial = mongoose.models.LearningMaterial || mongoose.model("LearningMaterial", learningMaterialSchema);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the BrainBytes API" });
});

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    let subject = req.body.subject || "General";
    const text = req.body.text?.toLowerCase() || "";

    if (!req.body.subject) {
      if (/math|equation|calculate|algebra|geometry|number/.test(text)) subject = "Math";
      else if (/science|biology|chemistry|physics|molecule|atom/.test(text)) subject = "Science";
      else if (/history|war|century|ancient|civilization/.test(text)) subject = "History";
      else if (/language|grammar|vocabulary|word|sentence|speak/.test(text)) subject = "Language";
      else if (/technology|computer|software|program|code|internet/.test(text)) subject = "Technology";
    }

    const userMessage = new Message({ text: req.body.text, isUser: true, subject });
    await userMessage.save();

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 15000));
    const aiResultPromise = aiService.generateResponse(req.body.text, subject);
    const aiResult = await Promise.race([aiResultPromise, timeoutPromise]).catch((err) => ({
      response: "I'm sorry, I couldn't process your request in time.",
      category: null,
    }));

    const aiMessage = new Message({
      text: aiResult.response,
      isUser: false,
      subject,
    });
    await aiMessage.save();

    res.status(201).json({ userMessage, aiMessage, category: aiResult.category });
  } catch (err) {
    console.error("Error in /api/messages route:", err);
    if (err.name === "MongooseError") {
      res.status(500).json({ error: "Database operation failed. Please try again later." });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.put("/api/users/me", async (req, res) => {
  try {
    const { name, email, avatar, currentEmail } = req.body;
    const user = await UserProfile.findOne({ email: currentEmail });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.name = name || user.name;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar;
    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.delete("/api/messages/subject/:subject", async (req, res) => {
  try {
    const subject = req.params.subject;
    const validSubjects = ["Math", "Science", "History", "Language", "Technology", "General"];
    const condition =
      subject === "General"
        ? {
            $or: [{ subject: "General" }, { subject: { $exists: false } }, { subject: null }, { subject: "" }, { subject: { $nin: validSubjects } }],
          }
        : { subject: new RegExp(`^${subject}$`, "i") };

    const result = await Message.deleteMany(condition);
    res.json({ message: `Deleted ${result.deletedCount} messages from subject: ${subject}`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Error deleting messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for testing
module.exports = { app, Message, UserProfile, LearningMaterial };
