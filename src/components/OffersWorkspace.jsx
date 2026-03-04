import React from 'react';

const OffersWorkspace = ({ isOffersOpen }) => {
  if (!isOffersOpen) return null;

  return (
    <div className="offers-overlay">
      <div className="offers-container">
        <div className="left-panel">
          <h2>Offered List</h2>
          <ul>
            <li>Item 1 - Status: Offered</li>
            <li>Item 2 - Status: Declined</li>
          </ul>
        </div>
        <div className="right-panel">
          <h2>Item Details</h2>
          <p>Placeholder content for item details.</p>
        </div>
      </div>
    </div>
  );
};

export default OffersWorkspace;