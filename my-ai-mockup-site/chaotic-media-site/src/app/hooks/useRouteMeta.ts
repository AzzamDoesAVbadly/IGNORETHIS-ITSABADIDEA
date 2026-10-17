import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const useRouteMeta = () => {
  const location = useLocation();
  const [meta, setMeta] = useState({ title: '', description: '' });

  useEffect(() => {
    const path = location.pathname;

    // Example metadata based on the route
    switch (path) {
      case '/':
        setMeta({
          title: 'Welcome to Chaotic Media',
          description: 'Explore the wildest content on the internet!',
        });
        break;
      case '/articles':
        setMeta({
          title: 'Articles - Chaotic Media',
          description: 'Dive into our collection of chaotic articles.',
        });
        break;
      case '/categories':
        setMeta({
          title: 'Categories - Chaotic Media',
          description: 'Browse through various categories of content.',
        });
        break;
      default:
        setMeta({
          title: 'Chaotic Media',
          description: 'A chaotic media experience.',
        });
        break;
    }
  }, [location]);

  return meta;
};

export default useRouteMeta;