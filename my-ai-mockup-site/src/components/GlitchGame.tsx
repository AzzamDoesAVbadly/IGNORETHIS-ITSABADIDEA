import React, { useEffect, useState } from 'react';
import './GlitchGame.css';

const GlitchGame = () => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching((prev) => !prev);
    }, 500);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className={`glitch-game ${isGlitching ? 'active' : ''}`}>
      <h1 className="glitch-title">ERROR 404: AI MALFUNCTION</h1>
      <p className="glitch-message">The AI has gone rogue! Try to catch the glitches!</p>
      <div className="glitch-overlay">
        <div className="glitch-effect"></div>
      </div>
    </div>
  );
};

export default GlitchGame;