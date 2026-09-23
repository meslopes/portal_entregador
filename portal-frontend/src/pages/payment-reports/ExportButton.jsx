import React from 'react';
import { Download } from 'lucide-react';

const ExportButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
      border: '1.5px solid #e2e8f0', background: 'white',
      color: '#374151', fontSize: '0.875rem', fontWeight: 500,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
    }}
  >
    <Download size={16} /> Exportar CSV
  </button>
);

export default ExportButton;
