import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="header">
            <h1 className="header-title">Broken AI Operator Dashboard</h1>
            <nav className="header-nav">
                <ul>
                    <li><a href="#dashboard">Dashboard</a></li>
                    <li><a href="#signals">Signals</a></li>
                    <li><a href="#diagnostics">Diagnostics</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;