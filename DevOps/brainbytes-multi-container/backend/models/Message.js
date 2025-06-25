const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  subject: { type: String, default: 'General' },
  sessionId: { type: String, required: true },
  userId: { type: String, required: true }, // Add userId to associate with a specific user
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);