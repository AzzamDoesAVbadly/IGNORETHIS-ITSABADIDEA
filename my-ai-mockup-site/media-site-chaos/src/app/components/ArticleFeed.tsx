import React from 'react';
import articles from '../data/articles';
import ArticleCard from './ArticleCard';

const ArticleFeed = () => {
  return (
    <div className="article-feed">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
};

export default ArticleFeed;