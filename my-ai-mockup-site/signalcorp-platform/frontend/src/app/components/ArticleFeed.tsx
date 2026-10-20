import React from 'react';
import { Article } from '../data/articles';

const ArticleFeed: React.FC<{ articles: Article[] }> = ({ articles }) => {
    return (
        <div className="article-feed">
            {articles.map((article) => (
                <div key={article.id} className="article-card">
                    <h2>{article.title}</h2>
                    <p>{article.summary}</p>
                    <a href={`/articles/${article.id}`}>Read more</a>
                </div>
            ))}
        </div>
    );
};

export default ArticleFeed;