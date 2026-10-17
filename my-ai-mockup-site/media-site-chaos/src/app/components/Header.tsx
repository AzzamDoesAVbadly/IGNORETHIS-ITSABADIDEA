import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="branding">
        <h1>Media Site Chaos</h1>
        <p>Your source for chaotic content!</p>
      </div>
      <nav className="navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/articles">Articles</a></li>
          <li><a href="/categories">Categories</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;