const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const aiService = require('./aiService');
const Message = require('./models/Message'); // Import the Message model
const mongoUri =
  process.env.NODE_ENV === 'test'
    ? 'mongodb://localhost:27017/brainbytes_test' // Local MongoDB for tests
    : 'mongodb://mongo:27017/brainbytes'; // Docker MongoDB for production

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
});

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
    const { text, subject = 'General', sessionId } = req.body;

    if (!text || !sessionId) {
      return res.status(400).json({ error: 'Text and sessionId are required' });
    }

    // Save the user message
    const userMessage = new Message({
      text,
      isUser: true,
      subject,
      sessionId,
    });
    await userMessage.save();

    const timeoutDuration = process.env.TIMEOUT_DURATION || 15000;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
    );

    const aiResultPromise = aiService.generateResponse(text, subject);

    const aiResult = await Promise.race([aiResultPromise, timeoutPromise]).catch((error) => {
      console.error('AI response timed out or failed:', error);
      return {
        response: "I'm sorry, but I couldn't process your request in time. Please try again later.",
      };
    });

    const aiMessage = new Message({
      text: aiResult.response,
      isUser: false,
      subject,
      sessionId,
    });
    await aiMessage.save();

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
    let user = await UserProfile.findOne();

    if (!user) {
      user = new UserProfile({
        name: 'John Doe',
        email: 'john.doe@example.com',
        preferredSubjects: ['Math', 'Technology'],
        joinDate: new Date('2024-11-15'),
      });
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get learning stats
app.get('/api/users/stats', async (req, res) => {
  try {
    const allMessages = await Message.find();

    const subjectCounts = {
      Math: 0,
      Science: 0,
      History: 0,
      Language: 0,
      Technology: 0,
      General: 0,
    };

    allMessages.forEach((message) => {
      if (message.isUser) {
        const subject = message.subject || 'General';
        if (subjectCounts.hasOwnProperty(subject)) {
          subjectCounts[subject]++;
        }
      }
    });

    const subjectData = Object.keys(subjectCounts).map((subject) => ({
      subject,
      count: subjectCounts[subject],
    }));

    const totalQuestions = Object.values(subjectCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    const lastMessage = await Message.findOne({ isUser: true }).sort({
      createdAt: -1,
    });
    const lastActiveDate = lastMessage ? lastMessage.createdAt : null;

    const streak = 5;

    res.json({
      subjectData,
      totalQuestions,
      lastActive: lastActiveDate,
      streak,
    });
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/send', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ error: 'Message and sessionId are required' });
    }

    // Save the user message
    const userMessage = new Message({
      text: message,
      isUser: true,
      sessionId,
    });
    await userMessage.save();

    // Generate AI response
    const aiResponse = await aiService.generateResponse(message);

    // Save the AI message
    const aiMessage = new Message({
      text: aiResponse.response,
      isUser: false,
      sessionId,
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

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    res.status(200).json({ messages });
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
