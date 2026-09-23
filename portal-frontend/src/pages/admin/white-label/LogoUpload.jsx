import React from 'react';
import { Image, Upload } from 'lucide-react';
import SectionCard from './SectionCard';

const LogoUpload = ({ logoUrl, onUpload }) => (
  <SectionCard icon={Image} title="Logo da Organização">
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{
        width: '100px', height: '100px', borderRadius: '0.75rem',
        border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center',
        justifyContent: 'center', overflow: 'hidden', background: '#f8fafc'
      }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Image size={32} style={{ color: '#64748b' }} />
        )}
      </div>

      <div>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#6366f1',
          color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500
        }}>
          <Upload size={16} /> Enviar Logo
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            style={{ display: 'none' }}
          />
        </label>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
          PNG, JPG ou SVG. Máximo 2MB.
        </p>
      </div>
    </div>
  </SectionCard>
);

export default LogoUpload;
