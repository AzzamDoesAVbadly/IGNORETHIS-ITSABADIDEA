import React from 'react';
import HeroBanner from '../components/HeroBanner';
import ArticleFeed from '../components/ArticleFeed';
import MonetizationStrip from '../components/MonetizationStrip';
import TrendingTicker from '../components/TrendingTicker';
import GlitchOverlay from '../components/GlitchOverlay';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <GlitchOverlay />
      <HeroBanner />
      <MonetizationStrip />
      <TrendingTicker />
      <ArticleFeed />
    </div>
  );
};

export default HomePage;