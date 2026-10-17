import React from 'react';
import { useParams } from 'react-router-dom';
import articles from '../data/articles';
import Layout from '../components/Layout';
import GlitchOverlay from '../components/GlitchOverlay';

const ArticlePage = () => {
  const { articleId } = useParams();
  const article = articles.find((art) => art.id === articleId);

  if (!article) {
    return (
      <Layout>
        <div className="error-message">Article not found!</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <GlitchOverlay />
      <div className="article-content">
        <h1>{article.title}</h1>
        <div className="article-body" dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>
    </Layout>
  );
};

export default ArticlePage;