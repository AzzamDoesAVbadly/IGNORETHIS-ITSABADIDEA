import React from 'react';
import { useParams } from 'react-router-dom';
import ArticleFeed from '../components/ArticleFeed';
import { articles } from '../data/articles';

const ArticlePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const article = articles.find(article => article.id === id);

    if (!article) {
        return <div>Article not found.</div>;
    }

    return (
        <div>
            <h1>{article.title}</h1>
            <div>{article.content}</div>
            <ArticleFeed />
        </div>
    );
};

export default ArticlePage;