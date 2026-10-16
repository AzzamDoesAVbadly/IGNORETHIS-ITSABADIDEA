import React, { useEffect, useState } from 'react';
import articlesData from '../data/articles';
import './ArticleFeed.css';

const ArticleFeed = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    // Simulate fetching articles from a data source
    const fetchArticles = () => {
      setArticles(articlesData);
    };

    fetchArticles();
  }, []);

  return (
    <div className="article-feed">
      {articles.length > 0 ? (
        articles.map((article) => (
          <div key={article.id} className="article-item">
            <h2>{article.title}</h2>
            <p>{article.content}</p>
          </div>
        ))
      ) : (
        <p>Loading articles...</p>
      )}
    </div>
  );
};

export default ArticleFeed;