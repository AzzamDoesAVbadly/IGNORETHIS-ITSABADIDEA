import React from 'react';
import { useParams } from 'react-router-dom';
import ArticleFeed from '../components/ArticleFeed';
import SectionUnlocks from '../components/SectionUnlocks';
import { articles } from '../data/articles';

const ArticlePage = () => {
  const { articleId } = useParams();
  const article = articles.find((art) => art.id === articleId);

  if (!article) {
    return <div>Article not found.</div>;
  }

  return (
    <div>
      <h1>{article.title}</h1>
      <p>{article.content}</p>
      <SectionUnlocks articleId={articleId} />
      <ArticleFeed />
    </div>
  );
};

export default ArticlePage;