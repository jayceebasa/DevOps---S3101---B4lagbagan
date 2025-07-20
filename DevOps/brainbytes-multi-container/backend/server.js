const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const aiService = require('./aiService');
// Start metrics server for Prometheus
const metrics = require('./monitoring/metrics');
const Message = require('./models/Message'); // Import the Message model
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/brainbytes';

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(metrics.metricsMiddleware); // <-- Add this line to enable Prometheus HTTP metrics

// Initialize AI model
aiService.initializeAI();

// Connect to MongoDB
const connectWithRetry = () => {
  mongoose
    .connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
    })
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error(
        'Failed to connect to MongoDB. Retrying in 5 seconds...',
        err
      );
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Define schemas
const userProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  preferredSubjects: [String],
  avatar: { type: String, default: null },
  joinDate: { type: Date, default: Date.now },
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

const learningMaterialSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  content: { type: String, required: true },
});

const LearningMaterial = mongoose.model(
  'LearningMaterial',
  learningMaterialSchema
);

// API Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the BrainBytes API' });
});

// User profile routes
app.put('/api/users/me', async (req, res) => {
  try {
    const { name, email, avatar, currentEmail } = req.body;

    const user = await UserProfile.findOne({ email: currentEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar;

    await user.save();
    res.json(user);

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
);

app.post('/api/users', async (req, res) => {
  try {
    const user = new UserProfile(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await UserProfile.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await UserProfile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await UserProfile.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Message routes
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { text, subject = 'General', sessionId, userEmail } = req.body;
    if (!text || !sessionId || !userEmail) {
      return res.status(400).json({ error: 'Text, sessionId, and userEmail are required' });
    }
    // Save the user message
    const userMessage = new Message({
      text,
      isUser: true,
      subject,
      sessionId,
      userEmail,
    });

    try {
      await userMessage.save();
      // Increment messages per subject metric
      if (metrics && metrics.incrementMessagesPerSubject) {
        metrics.incrementMessagesPerSubject(subject);
      }
      // Update daily active users gauge
      if (metrics && metrics.updateDailyActiveUsersGauge) {
        await metrics.updateDailyActiveUsersGauge();
      }
    } catch (err) {
      // Increment failed message saves metric
      if (metrics && metrics.incrementFailedMessageSaves) {
        metrics.incrementFailedMessageSaves();
      }
      throw err;
    }

    // Update active users gauge (count unique userEmails with recent activity)
    if (metrics && metrics.updateActiveUsersGauge) {
      await metrics.updateActiveUsersGauge();
    }
    // Update open sessions gauge (unique sessionIds in last 2 hours)
    if (metrics && metrics.updateOpenSessionsGauge) {
      await metrics.updateOpenSessionsGauge();
    }

    // Fetch chat history for the session and user
    const chatHistory = await Message.find({ sessionId, userEmail }).sort({ createdAt: 1 });

    const timeoutDuration = process.env.TIMEOUT_DURATION || 15000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
    );
    const aiStart = Date.now();
    const aiResultPromise = aiService.generateResponse(text, subject, chatHistory);
    const aiResult = await Promise.race([aiResultPromise, timeoutPromise]).catch((error) => {
      console.error('AI response timed out or failed:', error);
      return {
        response: "I'm sorry, but I couldn't process your request in time. Please try again later.",
      };
    });
    const aiDuration = (Date.now() - aiStart) / 1000;
    if (metrics && metrics.observeAIResponseTime) {
      metrics.observeAIResponseTime(aiDuration);
    }
    const aiMessage = new Message({
      text: aiResult.response,
      isUser: false,
      subject,
      sessionId,
      userEmail,
    });
    await aiMessage.save();
    // Increment AI responses metric
    if (metrics && metrics.incrementAIResponses) {
      metrics.incrementAIResponses();
    }
    res.status(201).json({
      userMessage,
      aiMessage,
      category: aiResult.category,
    });
  } catch (err) {
    console.error('Error in /api/messages route:', err);
    res.status(400).json({ error: err.message });
  }
});

// Improved: Return all messages for the user, grouped by subject
app.get('/api/chat/history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail is required' });
    }
    // Fetch all messages for this user, across all sessions
    const messages = await Message.find({ userEmail }).sort({ createdAt: 1 });
    res.status(200).json({ messages });
  } catch (err) {
    console.error('Error in /api/chat/history/:userEmail:', err);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
