import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './routes/HomePage';
import ArticlePage from './routes/ArticlePage';
import CategoryPage from './routes/CategoryPage';
import GlitchOverlay from './components/GlitchOverlay';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <GlitchOverlay />
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/article/:id" component={ArticlePage} />
          <Route path="/category/:category" component={CategoryPage} />
        </Switch>
      </Layout>
    </Router>
  );
};

export default App;