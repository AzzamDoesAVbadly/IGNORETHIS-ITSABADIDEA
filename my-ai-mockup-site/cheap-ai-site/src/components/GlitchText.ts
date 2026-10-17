import React from 'react';
import './GlitchText.css';

const GlitchText = ({ text }) => {
  return (
    <div className="glitch-text">
      {text.split('').map((char, index) => (
        <span key={index} className={`glitch-char glitch-${index % 2}`}>
          {char}
        </span>
      ))}
    </div>
  );
};

export default GlitchText;