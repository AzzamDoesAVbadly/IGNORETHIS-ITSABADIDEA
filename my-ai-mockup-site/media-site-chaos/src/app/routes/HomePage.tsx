import React from 'react';
import ArticleFeed from '../components/ArticleFeed';
import CuratorBubble from '../components/CuratorBubble';
import SectionUnlocks from '../components/SectionUnlocks';
import GlitchOverlay from '../components/GlitchOverlay';
import MonetizationBanner from '../components/MonetizationBanner';

const HomePage = () => {
  return (
    <div className="home-page">
      <GlitchOverlay />
      <CuratorBubble />
      <SectionUnlocks />
      <ArticleFeed />
      <MonetizationBanner />
    </div>
  );
};

export default HomePage;