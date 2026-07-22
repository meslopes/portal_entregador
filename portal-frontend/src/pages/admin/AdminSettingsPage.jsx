import React, { useState, useEffect } from 'react';
import {
  Settings, Save, AlertCircle, CheckCircle, CreditCard,
  Building2, Key, Copy, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';

const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({
    admin_bank_name: '',
    admin_bank_agency: '',
    admin_bank_account: '',
    admin_bank_pix_key: '',
    admin_cnpj: '',
    admin_company_name: '',
    delivery_price_per_km: '2.95'
  });

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/settings`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Erro ao carregar config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/settings`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }
      );
      if (response.ok) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Configurações</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Dados da empresa e configurações de pagamento</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white',
          fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1
        }}>
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Dados da Empresa */}
      <Section title="Dados da Empresa" icon={<Building2 size={18} />}>
        <FormField label="Nome da Empresa">
          <input type="text" value={config.admin_company_name} onChange={e => handleChange('admin_company_name', e.target.value)} style={inputStyle} placeholder="Ex: Muv.log Entregas" />
        </FormField>
        <FormField label="CNPJ">
          <input type="text" value={config.admin_cnpj} onChange={e => handleChange('admin_cnpj', e.target.value)} style={inputStyle} placeholder="00.000.000/0001-00" />
        </FormField>
      </Section>

      {/* Dados Bancarios (para QR Code) */}
      <Section title="Dados Bancários (para QR Code das Faturas)" icon={<CreditCard size={18} />}>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
          Esses dados são utilizados para gerar os QR Codes nas faturas digitais enviadas aos estabelecimentos.
          O estabelecimento irá escanear o QR Code para efetuar o pagamento.
        </p>
        <FormField label="Banco">
          <input type="text" value={config.admin_bank_name} onChange={e => handleChange('admin_bank_name', e.target.value)} style={inputStyle} placeholder="Ex: Banco do Brasil" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Agência">
            <input type="text" value={config.admin_bank_agency} onChange={e => handleChange('admin_bank_agency', e.target.value)} style={inputStyle} placeholder="0000-0" />
          </FormField>
          <FormField label="Conta">
            <input type="text" value={config.admin_bank_account} onChange={e => handleChange('admin_bank_account', e.target.value)} style={inputStyle} placeholder="00000-0" />
          </FormField>
        </div>
        <FormField label="Chave PIX">
          <input type="text" value={config.admin_bank_pix_key} onChange={e => handleChange('admin_bank_pix_key', e.target.value)} style={inputStyle} placeholder="CNPJ, email, telefone ou chave aleatória" />
        </FormField>
      </Section>

      {/* Configuracoes de Entrega */}
      <Section title="Configurações de Entrega" icon={<Settings size={18} />}>
        <FormField label="Preço por KM (R$)">
          <input type="number" step="0.01" value={config.delivery_price_per_km} onChange={e => handleChange('delivery_price_per_km', e.target.value)} style={inputStyle} placeholder="2.95" />
        </FormField>
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: '#2563eb' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>{title}</span>
    </div>
    <div style={{ padding: '1.5rem' }}>{children}</div>
  </div>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

export default AdminSettingsPage;
