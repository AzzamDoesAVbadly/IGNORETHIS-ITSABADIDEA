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
    <div 
      className="curator-bubble" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {isVisible && (
        <div className="bubble-message">
          🤖 Your AI curator is here! Explore the chaos of knowledge!
        </div>
      )}
      <style jsx>{`
        .curator-bubble {
          position: relative;
          cursor: pointer;
        }
        .bubble-message {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 5px;
          z-index: 10;
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default CuratorBubble;