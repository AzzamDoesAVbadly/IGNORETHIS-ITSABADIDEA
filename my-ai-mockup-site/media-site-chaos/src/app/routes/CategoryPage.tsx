import React from 'react';
import { useParams } from 'react-router-dom';
import ArticleFeed from '../components/ArticleFeed';
import { articles } from '../data/articles';
import Layout from '../components/Layout';

const CategoryPage = () => {
  const { category } = useParams();
  const filteredArticles = articles.filter(article => article.category === category);

  return (
    <Layout>
      <h1 className="category-title">{category}</h1>
      <ArticleFeed articles={filteredArticles} />
    </Layout>
  );
};

export default CategoryPage;