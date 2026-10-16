import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import RouteShell from './components/RouteShell';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import Header from './components/Header';

const App = () => {
  return (
    <Router>
      <RouteShell>
        <Header />
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/article/:id" component={ArticlePage} />
        </Switch>
      </RouteShell>
    </Router>
  );
};

export default App;