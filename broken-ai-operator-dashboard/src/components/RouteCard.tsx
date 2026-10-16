import React from 'react';

interface RouteCardProps {
    title: string;
    description: string;
    articleLink: string;
    diagnostics: string[];
}

const RouteCard: React.FC<RouteCardProps> = ({ title, description, articleLink, diagnostics }) => {
    return (
        <div className="route-card">
            <h2 className="route-card-title">{title}</h2>
            <p className="route-card-description">{description}</p>
            <a href={articleLink} className="route-card-link">Read Article</a>
            <div className="route-card-diagnostics">
                {diagnostics.map((diag, index) => (
                    <div key={index} className="diagnostic-item">{diag}</div>
                ))}
            </div>
        </div>
    );
};

export default RouteCard;