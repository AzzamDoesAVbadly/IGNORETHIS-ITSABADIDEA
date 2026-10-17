import React from 'react';
import { useTrendingArticles } from '../hooks/useContentEngine';

const TrendingTicker: React.FC = () => {
  const trendingArticles = useTrendingArticles();

  return (
    <div className="trending-ticker">
      <h2>Trending Now</h2>
      <ul>
        {trendingArticles.map((article) => (
          <li key={article.id} className="trending-item">
            <a href={`/articles/${article.id}`} className="trending-link">
              {article.title}
            </a>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .trending-ticker {
          background: rgba(255, 0, 0, 0.1);
          padding: 10px;
          border: 2px dashed #ff0000;
          position: relative;
          overflow: hidden;
        }
        .trending-item {
          animation: glitch 1s infinite;
        }
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 2px); }
          100% { transform: translate(0); }
        }
      `}</style>
    </div>
  );
};

export default TrendingTicker;