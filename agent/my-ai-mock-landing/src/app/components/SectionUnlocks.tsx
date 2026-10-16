import React, { useState } from 'react';

const SectionUnlocks = ({ sections }) => {
  const [unlockedSections, setUnlockedSections] = useState([]);

  const handleUnlock = (index) => {
    if (!unlockedSections.includes(index)) {
      setUnlockedSections([...unlockedSections, index]);
    }
  };

  return (
    <div className="section-unlocks">
      {sections.map((section, index) => (
        <div key={index} className={`section ${unlockedSections.includes(index) ? 'unlocked' : 'locked'}`}>
          <h2>{section.title}</h2>
          {unlockedSections.includes(index) ? (
            <p>{section.content}</p>
          ) : (
            <button onClick={() => handleUnlock(index)}>Unlock Section</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default SectionUnlocks;