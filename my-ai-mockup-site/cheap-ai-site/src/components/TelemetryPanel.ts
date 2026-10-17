import React from 'react';
import { telemetryData } from '../data/telemetry';

const TelemetryPanel = () => {
    return (
        <div className="telemetry-panel">
            <h2 className="telemetry-title">System Diagnostics</h2>
            <div className="telemetry-data">
                {telemetryData.map((data, index) => (
                    <div key={index} className="telemetry-item">
                        <span className="telemetry-label">{data.label}:</span>
                        <span className="telemetry-value">{data.value}</span>
                    </div>
                ))}
            </div>
            <div className="telemetry-fake-metrics">
                <div className="metric">CPU Usage: {Math.random().toFixed(2) * 100}%</div>
                <div className="metric">Memory Usage: {Math.random().toFixed(2) * 100}MB</div>
                <div className="metric">Network Latency: {Math.random().toFixed(2) * 100}ms</div>
            </div>
        </div>
    );
};

export default TelemetryPanel;