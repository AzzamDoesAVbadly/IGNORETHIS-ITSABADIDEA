import React from 'react';

const GlitchGameOverlay = () => {
    return (
        <div className="glitch-overlay">
            <h1 className="glitch-title">Error 404: Glitch Not Found</h1>
            <p className="glitch-message">The AI has gone rogue! Please stand by...</p>
            <div className="glitch-animation">
                {/* Add glitch animation here */}
            </div>
        </div>
    );
};

export default GlitchGameOverlay;