import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './routes/Dashboard';
import Header from '../components/Header';
import './styles/globals.css';

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;