import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const routeMeta = {
  '/': {
    title: 'Welcome to the AI Mock Landing',
    description: 'Explore our articles and experience the glitchy AI curator.',
  },
  '/article/:id': {
    title: 'Article Details',
    description: 'Dive deep into the article and unlock more content.',
  },
};

const useRouteMeta = () => {
  const location = useLocation();
  const [meta, setMeta] = useState({ title: '', description: '' });

  useEffect(() => {
    const currentPath = location.pathname;
    const currentMeta = routeMeta[currentPath] || routeMeta['/'];
    setMeta(currentMeta);
    document.title = currentMeta.title;
    document.querySelector('meta[name="description"]').setAttribute('content', currentMeta.description);
  }, [location]);

  return meta;
};

export default useRouteMeta;