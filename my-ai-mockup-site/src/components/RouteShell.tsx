import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const RouteShell: React.FC = () => {
  return (
    <div className="route-shell">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default RouteShell;