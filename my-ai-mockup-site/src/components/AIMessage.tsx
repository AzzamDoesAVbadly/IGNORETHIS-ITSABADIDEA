import React, { useState } from 'react';

const AIMessage: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);

  const handleMouseEnter = () => {
    const messages = [
      "Did you know? The internet is full of hidden gems!",
      "Curating content is my specialty. Let me show you!",
      "Oops! Looks like I found something interesting!",
      "Warning: AI at play! Proceed with curiosity.",
      "Ever wonder what lies beyond the surface? Let's explore!"
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);
  };

  const handleMouseLeave = () => {
    setMessage(null);
  };

  return (
    <div className="ai-message-container" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {message && <div className="ai-message">{message}</div>}
    </div>
  );
};

export default AIMessage;