import React from 'react';

const WhiteLabelPreview = ({ primaryColor, secondaryColor }) => (
  <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.5rem', background: '#f8fafc' }}>
    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Pré-visualização</p>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <div style={{
        padding: '0.5rem 1rem', borderRadius: '0.375rem',
        background: primaryColor, color: 'white',
        fontSize: '0.875rem', fontWeight: 500
      }}>
        Botão Primário
      </div>
      <div style={{
        padding: '0.5rem 1rem', borderRadius: '0.375rem',
        background: secondaryColor, color: '#1e293b',
        border: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 500
      }}>
        Botão Secundário
      </div>
    </div>
  </div>
);

export default WhiteLabelPreview;
