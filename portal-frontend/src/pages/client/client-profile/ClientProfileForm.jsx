import React from 'react';
import { Save } from 'lucide-react';

const ClientProfileForm = ({ profileData, setProfileData, isSaving, onSave }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem',
    padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
          Nome
        </label>
        <input
          type="text"
          value={profileData.first_name}
          onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
          style={{
            width: '100%', padding: '0.625rem 0.75rem',
            border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
            fontSize: '0.9375rem', outline: 'none'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
          Sobrenome
        </label>
        <input
          type="text"
          value={profileData.last_name}
          onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
          style={{
            width: '100%', padding: '0.625rem 0.75rem',
            border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
            fontSize: '0.9375rem', outline: 'none'
          }}
        />
      </div>
    </div>

    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Email
      </label>
      <input
        type="email"
        value={profileData.email}
        disabled
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none',
          background: '#f8fafc', color: '#64748b'
        }}
      />
    </div>

    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Telefone
      </label>
      <input
        type="tel"
        value={profileData.phone}
        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
        placeholder="(51) 99999-9999"
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none'
        }}
      />
    </div>

    <button
      onClick={onSave}
      disabled={isSaving}
      style={{
        width: '100%', padding: '0.75rem',
        borderRadius: '0.5rem', border: 'none',
        background: '#0d9488', color: 'white',
        fontSize: '0.9375rem', fontWeight: 600,
        cursor: isSaving ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', opacity: isSaving ? 0.7 : 1
      }}
    >
      <Save size={18} />
      {isSaving ? 'Salvando...' : 'Salvar Perfil'}
    </button>
  </div>
);

export default ClientProfileForm;
