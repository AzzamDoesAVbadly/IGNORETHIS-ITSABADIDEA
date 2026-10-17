import React from 'react';
import { useParams } from 'react-router-dom';
import { articles } from '../data/articles';
import { categories } from '../data/categories';
import ArticleFeed from '../components/ArticleFeed';
import GlitchOverlay from '../components/GlitchOverlay';

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const filteredArticles = articles.filter(article => article.categoryId === categoryId);
  const category = categories.find(cat => cat.id === categoryId);

  return (
    <div className="category-page">
      <h1>{category ? category.name : 'Category Not Found'}</h1>
      <ArticleFeed articles={filteredArticles} />
      <GlitchOverlay />
    </div>
  );
};

export default CategoryPage;