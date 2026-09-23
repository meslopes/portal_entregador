import React from 'react';

const ToggleSwitch = ({ checked, onChange }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
      background: checked ? '#2563eb' : '#94a3b8',
      borderRadius: '24px', transition: '0.3s'
    }}>
      <span style={{
        position: 'absolute', height: '18px', width: '18px',
        left: checked ? '27px' : '3px', bottom: '3px',
        background: 'white', borderRadius: '50%', transition: '0.3s'
      }} />
    </span>
  </label>
);

export default ToggleSwitch;
