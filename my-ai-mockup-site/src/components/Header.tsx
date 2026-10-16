import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css'; // Assuming you have a CSS file for styling

const Header = () => {
  return (
    <header className="header">
      <h1 className="logo">AI Mockup Site</h1>
      <nav className="navigation">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/articles">Articles</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;