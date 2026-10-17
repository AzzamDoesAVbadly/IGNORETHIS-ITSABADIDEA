import React, { useState } from 'react';

const CuratorBubble = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div className="curator-bubble" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {isVisible && (
        <div className="bubble-content">
          <p>🤖 Your AI Curator is here! Discover something chaotic!</p>
        </div>
      )}
      <style jsx>{`
        .curator-bubble {
          position: relative;
          cursor: pointer;
        }
        .bubble-content {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 5px;
          transition: opacity 0.3s ease;
          opacity: ${isVisible ? 1 : 0};
        }
      `}</style>
    </div>
  );
};

export default CuratorBubble;