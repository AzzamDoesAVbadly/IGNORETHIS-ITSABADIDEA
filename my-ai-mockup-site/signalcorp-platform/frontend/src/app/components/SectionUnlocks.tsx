import React from 'react';

const SectionUnlocks = () => {
    const [unlockedSections, setUnlockedSections] = React.useState([]);

    const handleUnlock = (section) => {
        if (!unlockedSections.includes(section)) {
            setUnlockedSections([...unlockedSections, section]);
        }
    };

    return (
        <div className="section-unlocks">
            <h2>Unlocked Sections</h2>
            <ul>
                {unlockedSections.map((section, index) => (
                    <li key={index}>{section}</li>
                ))}
            </ul>
            <button onClick={() => handleUnlock('New Section')}>Unlock New Section</button>
        </div>
    );
};

export default SectionUnlocks;