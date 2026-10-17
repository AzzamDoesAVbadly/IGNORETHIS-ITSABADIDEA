import React from 'react';
import Header from './Header';
import Footer from './Footer';
import './Layout.css'; // Assuming you have a CSS file for layout styles

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;