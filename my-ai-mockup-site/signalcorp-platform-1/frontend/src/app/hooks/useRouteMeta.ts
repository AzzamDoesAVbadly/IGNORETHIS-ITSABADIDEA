import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const useRouteMeta = () => {
    const location = useLocation();
    const [meta, setMeta] = useState({ title: '', description: '' });

    useEffect(() => {
        const routeMeta = {
            '/': {
                title: 'Home',
                description: 'Welcome to the AI Business platform.',
            },
            '/articles': {
                title: 'Articles',
                description: 'Explore our collection of articles.',
            },
            // Add more routes as needed
        };

        const currentMeta = routeMeta[location.pathname] || {
            title: 'Default Title',
            description: 'Default description for the application.',
        };

        setMeta(currentMeta);
        document.title = currentMeta.title;
        document.querySelector('meta[name="description"]').setAttribute('content', currentMeta.description);
    }, [location]);

    return meta;
};

export default useRouteMeta;