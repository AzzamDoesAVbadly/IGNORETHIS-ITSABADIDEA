import React from 'react';

interface ContentCardProps {
  title: string;
  excerpt: string;
  imageUrl: string;
  onClick: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ title, excerpt, imageUrl, onClick }) => {
  return (
    <div className="content-card" onClick={onClick}>
      <img src={imageUrl} alt={title} className="content-card-image" />
      <div className="content-card-body">
        <h3 className="content-card-title">{title}</h3>
        <p className="content-card-excerpt">{excerpt}</p>
      </div>
      <style jsx>{`
        .content-card {
          border: 2px solid #ff4081;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s;
          cursor: pointer;
          background: linear-gradient(135deg, #ff4081, #ff80ab);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .content-card:hover {
          transform: scale(1.05);
        }
        .content-card-image {
          width: 100%;
          height: auto;
        }
        .content-card-body {
          padding: 16px;
          color: #fff;
        }
        .content-card-title {
          font-size: 1.5rem;
          margin: 0;
        }
        .content-card-excerpt {
          font-size: 1rem;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default ContentCard;