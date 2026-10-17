import React from 'react';
import { useParams } from 'react-router-dom';
import { articles } from '../data/articles';
import ContentCard from '../components/ContentCard';
import GlitchOverlay from '../components/GlitchOverlay';
import './ArticlePage.css';

const ArticlePage = () => {
  const { id } = useParams();
  const article = articles.find((article) => article.id === id);

  if (!article) {
    return <div className="error">Article not found!</div>;
  }

  return (
    <div className="article-page">
      <GlitchOverlay />
      <h1 className="article-title">{article.title}</h1>
      <div className="article-content">
        <ContentCard content={article.content} />
      </div>
      <div className="article-footer">
        <p>Published on: {new Date(article.publishedDate).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default ArticlePage;