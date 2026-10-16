import React, { useEffect, useState } from 'react';
import './GlitchGameOverlay.css';

const GlitchGameOverlay = () => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching((prev) => !prev);
    }, 500);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className={`glitch-overlay ${isGlitching ? 'active' : ''}`}>
      <h1 className="glitch-title">ERROR 404: AI MALFUNCTION</h1>
      <p className="glitch-message">The AI has gone rogue! Try to catch it!</p>
      <div className="glitch-game">
        {/* Glitchy minigame content goes here */}
      </div>
    </div>
  );
};

export default GlitchGameOverlay;