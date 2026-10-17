import React from 'react';
import './CrtOverlay.css';

const CrtOverlay = () => {
    return (
        <div className="crt-overlay">
            <div className="flicker"></div>
            <div className="distortion"></div>
            <div className="scanlines"></div>
        </div>
    );
};

export default CrtOverlay;