import React from 'react';

const DiagnosticPanel: React.FC = () => {
    const fakeDiagnostics = [
        { id: 1, message: "AI System Operational", status: "green" },
        { id: 2, message: "Data Syncing Issues", status: "yellow" },
        { id: 3, message: "Unexpected Error Detected", status: "red" },
        { id: 4, message: "All Systems Nominal", status: "green" },
        { id: 5, message: "Memory Leak Warning", status: "orange" },
    ];

    return (
        <div className="diagnostic-panel">
            <h2>Diagnostic Panel</h2>
            <ul>
                {fakeDiagnostics.map(diagnostic => (
                    <li key={diagnostic.id} className={`diagnostic-item ${diagnostic.status}`}>
                        {diagnostic.message}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DiagnosticPanel;