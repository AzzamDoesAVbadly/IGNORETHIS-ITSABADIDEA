import React from 'react';
import { useContentEngine } from '../hooks/useContentEngine';
import ContentCard from './ContentCard';
import './ArticleFeed.css';

const ArticleFeed = () => {
  const { articles, loading, error } = useContentEngine();

  if (loading) {
    return <div className="loading">Loading articles...</div>;
  }

  if (error) {
    return <div className="error">Error loading articles: {error.message}</div>;
  }

  return (
    <div className="article-feed">
      {articles.map((article) => (
        <ContentCard key={article.id} article={article} />
      ))}
    </div>
  );
};

export default ArticleFeed;