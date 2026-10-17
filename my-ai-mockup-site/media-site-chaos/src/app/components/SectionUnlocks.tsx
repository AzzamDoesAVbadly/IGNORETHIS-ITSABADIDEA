import React, { useState } from 'react';

const SectionUnlocks = () => {
  const [unlockedSections, setUnlockedSections] = useState([]);

  const handleUnlock = (section) => {
    if (!unlockedSections.includes(section)) {
      setUnlockedSections([...unlockedSections, section]);
    }
  };

  return (
    <div className="section-unlocks">
      <h2>Unlock More Content</h2>
      <div className="sections">
        <div className={`section ${unlockedSections.includes('section1') ? 'unlocked' : ''}`} onClick={() => handleUnlock('section1')}>
          <h3>Section 1</h3>
          {unlockedSections.includes('section1') && <p>This is the content of Section 1.</p>}
        </div>
        <div className={`section ${unlockedSections.includes('section2') ? 'unlocked' : ''}`} onClick={() => handleUnlock('section2')}>
          <h3>Section 2</h3>
          {unlockedSections.includes('section2') && <p>This is the content of Section 2.</p>}
        </div>
        <div className={`section ${unlockedSections.includes('section3') ? 'unlocked' : ''}`} onClick={() => handleUnlock('section3')}>
          <h3>Section 3</h3>
          {unlockedSections.includes('section3') && <p>This is the content of Section 3.</p>}
        </div>
      </div>
      <style jsx>{`
        .section-unlocks {
          padding: 20px;
          background: #222;
          color: #fff;
        }
        .sections {
          display: flex;
          flex-direction: column;
        }
        .section {
          padding: 15px;
          margin: 10px 0;
          background: #444;
          cursor: pointer;
          transition: background 0.3s;
        }
        .section.unlocked {
          background: #666;
        }
      `}</style>
    </div>
  );
};

export default SectionUnlocks;