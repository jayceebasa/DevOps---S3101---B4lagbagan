const mongoose = require('mongoose');

// Save a message to the database
async function saveMessage(message) {
  const Message = mongoose.model('Message');
  const savedMessage = await Message.create(message);
  return savedMessage;
}

// Get messages by session ID
async function getMessagesBySession(sessionId) {
  const Message = mongoose.model('Message');
  const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
  return messages;
}

module.exports = {
  saveMessage,
  getMessagesBySession,
};