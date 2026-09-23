import React from 'react';

const LayoutFooter = () => {
  return (
    <style>{`
      .mobile-menu-btn { display: none; }
      @media (max-width: 768px) {
        .mobile-menu-btn { display: block !important; }
        nav { display: none !important; }
      }
    `}</style>
  );
};

export default LayoutFooter;
