import React from 'react';
import './GlitchOverlay.css';

const GlitchOverlay: React.FC = () => {
  return (
    <div className="glitch-overlay">
      <div className="glitch" />
      <div className="glitch" />
      <div className="glitch" />
    </div>
  );
};

export default GlitchOverlay;