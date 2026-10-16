import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomePage from '../routes/HomePage';
import ArticlePage from '../routes/ArticlePage';

const Layout: React.FC = () => {
  return (
    <Router>
      <div className="layout">
        <header>
          <h1>AI Mock Landing</h1>
          {/* Navigation can be added here */}
        </header>
        <main>
          <Switch>
            <Route path="/" exact component={HomePage} />
            <Route path="/article/:id" component={ArticlePage} />
          </Switch>
        </main>
        <footer>
          <p>&copy; 2023 AI Mock Project</p>
        </footer>
      </div>
    </Router>
  );
};

export default Layout;