import React from 'react';
import { monetizationOptions } from '../data/monetization';

const MonetizationStrip: React.FC = () => {
  return (
    <div className="monetization-strip">
      {monetizationOptions.map((option, index) => (
        <div key={index} className="monetization-option">
          <h3>{option.title}</h3>
          <p>{option.description}</p>
          <a href={option.link} className="cta-button">
            {option.cta}
          </a>
        </div>
      ))}
    </div>
  );
};

export default MonetizationStrip;