import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css'; // Assuming you have a CSS file for styling

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2 className="sidebar-title">Explore</h2>
      <ul className="sidebar-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/articles">Articles</Link>
        </li>
        <li>
          <Link to="/categories">Categories</Link>
        </li>
        <li>
          <Link to="/trending">Trending</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
      </ul>
      <div className="sidebar-advertisement">
        <h3>Sponsored</h3>
        <p>Check out our latest offers!</p>
      </div>
    </div>
  );
};

export default Sidebar;