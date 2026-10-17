import React from 'react';
import CrtOverlay from './CrtOverlay';
import TelemetryPanel from './TelemetryPanel';
import GlitchText from './GlitchText';

const Hero: React.FC = () => {
    return (
        <div className="hero-container">
            <CrtOverlay />
            <div className="hero-content">
                <GlitchText text="Welcome to the AI Abyss" />
                <TelemetryPanel />
            </div>
        </div>
    );
};

export default Hero;