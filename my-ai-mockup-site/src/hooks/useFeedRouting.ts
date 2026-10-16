import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import articles from '../data/articles';

const useFeedRouting = () => {
  const location = useLocation();
  const [currentArticle, setCurrentArticle] = useState(null);

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    const article = articles.find(article => article.id === path);
    setCurrentArticle(article);
  }, [location]);

  return { currentArticle };
};

export default useFeedRouting;