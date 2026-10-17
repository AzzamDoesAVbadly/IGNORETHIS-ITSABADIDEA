import React from 'react';
import Header from './Header';
import Footer from './Footer';
import GlitchOverlay from './GlitchOverlay';
import './Layout.css'; // Assuming you have a CSS file for layout styles

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="layout">
      <GlitchOverlay />
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;