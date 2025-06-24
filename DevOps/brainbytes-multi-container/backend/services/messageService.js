const db = require('../db');

// Save a message
async function saveMessage(message) {
  return await db.saveMessage(message);
}

// Get messages by session ID
async function getMessagesBySession(sessionId) {
  return await db.getMessagesBySession(sessionId);
}

module.exports = {
  saveMessage,
  getMessagesBySession,
};