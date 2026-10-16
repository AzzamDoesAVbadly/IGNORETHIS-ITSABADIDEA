import React, { useEffect, useState } from 'react';
import { Article } from '../types';

const ArticleFeed: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await import('../data/articles');
        setArticles(response.default);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return <div>Loading articles...</div>;
  }

  return (
    <div className="article-feed">
      {articles.map((article) => (
        <div key={article.id} className="article-item">
          <h2>{article.title}</h2>
          <p>{article.content}</p>
        </div>
      ))}
    </div>
  );
};

export default ArticleFeed;