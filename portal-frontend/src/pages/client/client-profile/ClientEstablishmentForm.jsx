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

    {/* Distribuição de pedidos a entregadores próprios (configurável) */}
    <div style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
        Distribuição de pedidos (entregadores próprios)
      </p>
      <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.75rem' }}>
        Manual (padrão): você escolhe o entregador em cada pedido. Automático: o sistema oferece ao
        entregador cuja rota segue a mesma direção do pedido (corredor angular), respeitando o limite abaixo.
        A escolha manual continua disponível nos dois modos.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Modo</label>
          <select
            value={establishmentData.distribution_mode || 'MANUAL'}
            onChange={e => setEstablishmentData({ ...establishmentData, distribution_mode: e.target.value })}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          >
            <option value="MANUAL">Manual (padrão)</option>
            <option value="AUTO">Automático (corredor angular)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Janela angular (± graus)</label>
          <input
            type="number" min="5" max="180"
            value={establishmentData.route_angle_tolerance ?? 45}
            onChange={e => setEstablishmentData({ ...establishmentData, route_angle_tolerance: e.target.value })}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Limite de pedidos por rota</label>
          <input
            type="number" min="1" max="20"
            value={establishmentData.route_max_orders ?? 3}
            onChange={e => setEstablishmentData({ ...establishmentData, route_max_orders: e.target.value })}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Raio máximo (km — 0 = sem limite)</label>
          <input
            type="number" min="0" max="200" step="0.5"
            value={establishmentData.route_max_distance_km ?? 10}
            onChange={e => setEstablishmentData({ ...establishmentData, route_max_distance_km: e.target.value })}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
      </div>
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
