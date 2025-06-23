import React, { useState } from 'react';

const ChatInput = ({ onSubmit }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim()) {
      onSubmit(message);
      setMessage(''); // Clear the input field after submission
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Type your question"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSubmit}>Send</button>
    </div>
  );
};

export default ChatInput;