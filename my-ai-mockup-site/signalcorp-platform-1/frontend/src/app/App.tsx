import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomePage from './routes/HomePage';
import ArticlePage from './routes/ArticlePage';
import Layout from './components/Layout';
import './styles/globals.css';

const App = () => {
  return (
    <Router>
      <Layout>
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/article/:id" component={ArticlePage} />
        </Switch>
      </Layout>
    </Router>
  );
};

export default App;