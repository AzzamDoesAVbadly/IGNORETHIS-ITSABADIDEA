import React from 'react';
import './HeroBanner.css'; // Assuming you have a CSS file for styling

const HeroBanner: React.FC = () => {
  return (
    <div className="hero-banner">
      <h1 className="hero-title">Welcome to the Chaotic Media Site!</h1>
      <p className="hero-subtitle">Dive into a world of unpredictable content!</p>
      <button className="hero-button">Explore Now</button>
      <div className="chaotic-background"></div>
    </div>
  );
};

export default HeroBanner;