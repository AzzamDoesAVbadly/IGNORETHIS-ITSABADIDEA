import React from 'react';
import { useParams } from 'react-router-dom';
import ArticleFeed from '../components/ArticleFeed';
import AIMessage from '../components/AIMessage';
import SectionUnlock from '../components/SectionUnlock';
import GlitchGame from '../components/GlitchGame';
import { articles } from '../data/articles';

const ArticlePage = () => {
    const { id } = useParams();
    const article = articles.find(article => article.id === id);

    if (!article) {
        return <div>Article not found</div>;
    }

    return (
        <div>
            <h1>{article.title}</h1>
            <p>{article.content}</p>
            <AIMessage />
            <SectionUnlock />
            <GlitchGame />
            <ArticleFeed />
        </div>
    );
};

export default ArticlePage;