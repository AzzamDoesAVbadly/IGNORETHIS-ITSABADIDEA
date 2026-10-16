import React from 'react';
import { RouteCard } from '../../components/RouteCard';
import { DiagnosticPanel } from '../../components/DiagnosticPanel';
import { GlitchOverlay } from '../../components/GlitchOverlay';
import { SignalGrid } from '../../components/SignalGrid';
import { useDashboardData } from '../../hooks/useDashboardData';

const Dashboard: React.FC = () => {
    const { articles, diagnostics } = useDashboardData();

    return (
        <div className="dashboard">
            <GlitchOverlay />
            <SignalGrid />
            <div className="content">
                {articles.map(article => (
                    <RouteCard key={article.id} article={article} />
                ))}
                <DiagnosticPanel diagnostics={diagnostics} />
            </div>
        </div>
    );
};

export default Dashboard;