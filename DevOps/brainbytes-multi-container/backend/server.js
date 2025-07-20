// ...existing code...

// Place this route after app is initialized
app.get('/api/users/stats', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get all messages for this user
    const messages = await Message.find({ userEmail: email });

    // Subject breakdown
    const subjectData = [];
    const subjectCounts = {};
    let lastActive = null;
    messages.forEach(msg => {
      const subject = msg.subject || 'General';
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      if (!lastActive || msg.createdAt > lastActive) lastActive = msg.createdAt;
    });
    for (const [subject, count] of Object.entries(subjectCounts)) {
      subjectData.push({ subject, count });
    }

    // Calculate streak (number of consecutive days with at least one message)
    const days = new Set(messages.map(msg => new Date(msg.createdAt).toDateString()));
    let streak = 0;
    if (days.size > 0) {
      // Check for consecutive days up to today
      let current = new Date();
      while (days.has(current.toDateString())) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
    }

    res.json({
      totalQuestions: messages.length,
      subjectData,
      streak,
      lastActive
    });
  } catch (err) {
    console.error('Error in /api/users/stats:', err);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});
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

app.delete('/api/messages/subject/:subject', async (req, res) => {
  try {
    const { subject } = req.params;

    const validSubjects = [
      'Math',
      'Science',
      'History',
      'Language',
      'Technology',
      'General',
    ];
    const result =
      subject === 'General'
        ? await Message.deleteMany({
            $or: [
              { subject: 'General' },
              { subject: { $exists: false } },
              { subject: null },
              { subject: '' },
              { subject: { $nin: validSubjects } },
            ],
          })
        : await Message.deleteMany({
            subject: new RegExp(`^${subject}$`, 'i'),
          });

    res.json({
      message: `Deleted ${result.deletedCount} messages from subject: ${subject}`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('Error deleting messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Learning material routes
app.post('/api/materials', async (req, res) => {
  try {
    const material = new LearningMaterial(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/materials', async (req, res) => {
  try {
    const materials = await LearningMaterial.find();
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile
app.get('/api/users/me', async (req, res) => {
  try {
    // Try to get email from query param, header, or session (if using auth middleware)
    let email = req.query.email || req.headers["x-user-email"];
    // Fallback: try to get from next-auth session cookie if available (not implemented here)
    if (!email && req.body && req.body.email) email = req.body.email;
    // If not provided, return error
    if (!email) {
      return res.status(400).json({ error: "Email is required to fetch user profile" });
    }
    let user = await UserProfile.findOne({ email });
    if (!user) {
      // Optionally, get name/avatar from query/body if available
      const name = req.query.name || req.body?.name || 'New User';
      const avatar = req.query.avatar || req.body?.avatar || null;
      user = new UserProfile({
        name,
        email,
        avatar,
        preferredSubjects: ['Math', 'Technology'],
        joinDate: new Date(),
      });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});




app.post('/api/chat/send', async (req, res) => {
  try {
    const { message, sessionId, subject = 'General', userEmail } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ error: 'Message and sessionId are required' });
    }

    // Save the user message with subject
    const userMessage = new Message({
      text: message,
      isUser: true,
      sessionId,
      subject,
      userEmail,
    });
    await userMessage.save();

    // Generate AI response
    const aiResponse = await aiService.generateResponse(message);

    // Save the AI message with subject
    const aiMessage = new Message({
      text: aiResponse.response,
      isUser: false,
      sessionId,
      subject,
      userEmail,
    });
    await aiMessage.save();

    res.status(200).json({
      userMessage,
      aiMessage,
    });
  } catch (err) {
    console.error('Error in /api/chat/send:', err);
    res.status(500).json({ error: 'Failed to process the message' });
  }
});

app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userEmail } = req.query;

    if (!sessionId || !userEmail) {
      return res.status(400).json({ error: 'Session ID and userEmail are required' });
    }

    const messages = await Message.find({ sessionId, userEmail }).sort({ createdAt: 1 });
    // Group messages by subject
    const grouped = {};
    messages.forEach((msg) => {
      const subject = msg.subject && typeof msg.subject === 'string' && msg.subject.trim() !== '' ? msg.subject : 'General';
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(msg);
    });
    res.status(200).json({ messagesBySubject: grouped });
  } catch (err) {
    console.error('Error in /api/chat/history/:sessionId:', err);
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
