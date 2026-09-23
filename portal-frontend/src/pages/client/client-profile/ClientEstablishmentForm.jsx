import React from 'react';
import { Save } from 'lucide-react';

const ClientEstablishmentForm = ({ establishmentData, setEstablishmentData, isSaving, onSave }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem',
    padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Nome do Estabelecimento
      </label>
      <input
        type="text"
        value={establishmentData.name}
        onChange={e => setEstablishmentData({ ...establishmentData, name: e.target.value })}
        placeholder="Ex: Padaria Central"
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none'
        }}
      />
    </div>

    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Endereço
      </label>
      <input
        type="text"
        value={establishmentData.address}
        onChange={e => setEstablishmentData({ ...establishmentData, address: e.target.value })}
        placeholder="Rua, número - Bairro"
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none'
        }}
      />
    </div>

    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Telefone do Estabelecimento
      </label>
      <input
        type="tel"
        value={establishmentData.phone}
        onChange={e => setEstablishmentData({ ...establishmentData, phone: e.target.value })}
        placeholder="(51) 3333-4444"
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none'
        }}
      />
    </div>

    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
        Descrição (opcional)
      </label>
      <textarea
        value={establishmentData.description}
        onChange={e => setEstablishmentData({ ...establishmentData, description: e.target.value })}
        placeholder="Breve descrição do estabelecimento"
        rows={3}
        style={{
          width: '100%', padding: '0.625rem 0.75rem',
          border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
          fontSize: '0.9375rem', outline: 'none', resize: 'vertical'
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
      {isSaving ? 'Salvando...' : 'Salvar Estabelecimento'}
    </button>
  </div>
);

export default ClientEstablishmentForm;
