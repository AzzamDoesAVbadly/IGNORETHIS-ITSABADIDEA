import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './routes/HomePage';
import ArticlePage from './routes/ArticlePage';
import CategoryPage from './routes/CategoryPage';

const App = () => {
  return (
    <Router>
      <Layout>
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