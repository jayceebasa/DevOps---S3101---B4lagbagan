const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);