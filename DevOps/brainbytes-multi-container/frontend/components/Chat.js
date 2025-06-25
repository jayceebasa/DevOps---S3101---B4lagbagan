import React, { useState } from 'react';
import ChatInput from './ChatInput';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (message) => {
  console.log('Setting loading to true');
  setLoading(true); // Set loading to true before the API call
  setError(null);

  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    setMessages((prev) => [
      ...prev,
      { text: data.userMessage.text, sender: 'user' },
      { text: data.aiMessage.text, sender: 'ai' },
    ]);
  } catch (err) {
    setError('An error occurred while sending the message.');
  } finally {
    console.log('Setting loading to false');
    setLoading(false); // Reset loading to false after the API call
  }
};

  return (
    <div>
      <div>
        {messages.map((msg, index) => (
          <div key={index} data-testid={`message-${index}`}>
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>
      {loading && <div data-testid="loading-indicator">Loading...</div>}
      {error && <div>{error}</div>}
      <ChatInput onSubmit={sendMessage} />
    </div>
  );
};

export default Chat;