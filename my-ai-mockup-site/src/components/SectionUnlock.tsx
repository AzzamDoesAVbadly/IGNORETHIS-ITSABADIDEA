import React, { useState } from 'react';

const SectionUnlock: React.FC = () => {
  const [unlockedSections, setUnlockedSections] = useState<number[]>([]);

  const handleUnlock = (sectionIndex: number) => {
    if (!unlockedSections.includes(sectionIndex)) {
      setUnlockedSections([...unlockedSections, sectionIndex]);
    }
  };

  return (
    <div className="section-unlock">
      <h2>Unlock More Content</h2>
      <div className="sections">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`section ${unlockedSections.includes(index) ? 'unlocked' : 'locked'}`}
            onClick={() => handleUnlock(index)}
          >
            {unlockedSections.includes(index) ? (
              <p>Section {index + 1} Content: This is the unlocked content!</p>
            ) : (
              <p>Section {index + 1} - Click to unlock!</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionUnlock;