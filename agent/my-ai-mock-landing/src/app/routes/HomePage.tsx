import React from 'react';
import ArticleFeed from '../components/ArticleFeed';
import CuratorBubble from '../components/CuratorBubble';
import GlitchGameOverlay from '../components/GlitchGameOverlay';

const HomePage = () => {
  return (
    <div className="homepage">
      <GlitchGameOverlay />
      <CuratorBubble />
      <h1>Welcome to the AI Mock Landing Page</h1>
      <ArticleFeed />
    </div>
  );
};

export default HomePage;