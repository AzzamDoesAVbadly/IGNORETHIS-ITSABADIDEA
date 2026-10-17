import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useRouteMeta = (meta) => {
  const location = useLocation();

  useEffect(() => {
    document.title = meta.title || 'Default Title';
    document.description = meta.description || 'Default description for the media site.';
    
    // Additional meta tags can be set here
    const metaTags = document.querySelectorAll('meta[name]');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name');
      if (name && meta[name]) {
        tag.setAttribute('content', meta[name]);
      }
    });
  }, [location, meta]);

  return null;
};

export default useRouteMeta;