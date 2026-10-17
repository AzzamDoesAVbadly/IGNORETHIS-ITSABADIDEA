import React from 'react';

const Divider: React.FC = () => {
  return (
    <div style={{ 
      height: '2px', 
      background: 'linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 50%, rgba(0,255,0,1) 100%)', 
      margin: '20px 0', 
      filter: 'blur(1px)', 
      animation: 'glitch 1s infinite' 
    }} />
  );
};

export default Divider;