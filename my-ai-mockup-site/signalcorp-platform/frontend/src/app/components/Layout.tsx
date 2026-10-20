import React from 'react';

const Layout: React.FC = ({ children }) => {
    return (
        <div className="layout">
            <header>
                <h1>SignalCorp Platform</h1>
            </header>
            <main>{children}</main>
            <footer>
                <p>&copy; {new Date().getFullYear()} SignalCorp. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;