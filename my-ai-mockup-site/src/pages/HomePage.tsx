import React from 'react';
import ArticleFeed from '../components/ArticleFeed';
import AIMessage from '../components/AIMessage';
import SectionUnlock from '../components/SectionUnlock';
import GlitchGame from '../components/GlitchGame';

const HomePage: React.FC = () => {
  return (
    <div>
      <h1>Welcome to the AI Mockup Site</h1>
      <AIMessage />
      <SectionUnlock />
      <ArticleFeed />
      <GlitchGame />
    </div>
  );
};

export default HomePage;