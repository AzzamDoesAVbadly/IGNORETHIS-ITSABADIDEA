import React from 'react';
import './SignalGrid.css';

const SignalGrid = () => {
    return (
        <div className="signal-grid">
            <div className="signal-overlay">
                {/* Dark signal overlays will be rendered here */}
            </div>
            <div className="glitch-motion">
                {/* Stronger glitch motion effects will be applied here */}
            </div>
        </div>
    );
};

export default SignalGrid;