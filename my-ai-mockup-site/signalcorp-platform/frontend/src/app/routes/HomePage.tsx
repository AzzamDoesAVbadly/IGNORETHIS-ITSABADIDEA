import React from 'react';
import Layout from '../components/Layout';
import ArticleFeed from '../components/ArticleFeed';
import CuratorBubble from '../components/CuratorBubble';
import SectionUnlocks from '../components/SectionUnlocks';
import GlitchGameOverlay from '../components/GlitchGameOverlay';

const HomePage: React.FC = () => {
    return (
        <Layout>
            <CuratorBubble />
            <ArticleFeed />
            <SectionUnlocks />
            <GlitchGameOverlay />
        </Layout>
    );
};

export default HomePage;