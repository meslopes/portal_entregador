import React, { useState, useEffect } from 'react';
import {
  Globe, AlertCircle, CheckCircle, X, Save, Settings,
  Link, Shield
} from 'lucide-react';
import api from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';

const INTEGRATIONS = [
  { key: 'ifood', name: 'iFood', color: '#ea1d2c', description: 'Receber pedidos automaticamente do iFood' },
  { key: '99food', name: '99Food', color: '#ff6600', description: 'Receber pedidos automaticamente do 99Food' },
  { key: 'instadelivery', name: 'InstaDelivery', color: '#ff4500', description: 'Receber pedidos automaticamente do InstaDelivery' },
  { key: 'saipos', name: 'SaiPos', color: '#00a651', description: 'Receber pedidos automaticamente do SaiPos' },
  { key: 'whatsapp', name: 'WhatsApp', color: '#25d366', description: 'Receber pedidos via WhatsApp' },
];

const ClientIntegrationsPage = () => {
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setIntegrations({
        ifood_key: data.ifood_api_key || '',
        ifood_enabled: data.integration_ifood === 'enabled',
        food99_key: data.food99_api_key || '',
        food99_enabled: data.integration_99food === 'enabled',
        instadelivery_key: data.instadelivery_api_key || '',
        instadelivery_enabled: data.integration_instadelivery === 'enabled',
        saipos_key: data.saipos_api_key || '',
        saipos_enabled: data.integration_saipos === 'enabled',
        whatsapp_token: data.whatsapp_api_token || '',
        whatsapp_phone: data.whatsapp_phone || '',
        whatsapp_enabled: data.integration_whatsapp === 'enabled',
      });
    } catch (err) {
      console.error(err);
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
      const payload = {
        integration_ifood: integrations.ifood_enabled ? 'enabled' : 'disabled',
        ifood_api_key: integrations.ifood_key,
        integration_99food: integrations.food99_enabled ? 'enabled' : 'disabled',
        food99_api_key: integrations.food99_key,
        integration_instadelivery: integrations.instadelivery_enabled ? 'enabled' : 'disabled',
        instadelivery_api_key: integrations.instadelivery_key,
        integration_saipos: integrations.saipos_enabled ? 'enabled' : 'disabled',
        saipos_api_key: integrations.saipos_key,
        integration_whatsapp: integrations.whatsapp_enabled ? 'enabled' : 'disabled',
        whatsapp_api_token: integrations.whatsapp_token,
        whatsapp_phone: integrations.whatsapp_phone,
      };
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccess('Integrações salvas com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleIntegration = (key, field) => {
    setIntegrations(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Integrações</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Configure suas integrações com plataformas externas</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white',
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

      {INTEGRATIONS.map(integ => (
        <div key={integ.key} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: integ.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.625rem', fontWeight: 700 }}>
                {integ.key === 'whatsapp' ? 'WA' : integ.key.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{integ.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{integ.description}</p>
              </div>
            </div>
            <button onClick={() => toggleIntegration(integ.key, `${integ.key}_enabled`)} style={{
              padding: '0.375rem 0.75rem', borderRadius: '9999px', border: 'none',
              background: integrations[`${integ.key}_enabled`] ? '#dcfce7' : '#f1f5f9',
              color: integrations[`${integ.key}_enabled`] ? '#16a34a' : '#94a3b8',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {integrations[`${integ.key}_enabled`] ? 'Ativada' : 'Desativada'}
            </button>
          </div>
          {integrations[`${integ.key}_enabled`] && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              {integ.key === 'whatsapp' ? (
                <>
                  <FormField label="Token API WhatsApp Business">
                    <input type="password" value={integrations.whatsapp_token || ''} onChange={e => setIntegrations(p => ({ ...p, whatsapp_token: e.target.value }))} style={inputStyle} placeholder="Token da API WhatsApp Business" />
                  </FormField>
                  <FormField label="Número de Origem">
                    <input type="text" value={integrations.whatsapp_phone || ''} onChange={e => setIntegrations(p => ({ ...p, whatsapp_phone: e.target.value }))} style={inputStyle} placeholder="+5500000000000" />
                  </FormField>
                </>
              ) : (
                <FormField label={`API Key ${integ.name}`}>
                  <input type="password" value={integrations[`${integ.key}_key`] || ''} onChange={e => setIntegrations(p => ({ ...p, [`${integ.key}_key`]: e.target.value }))} style={inputStyle} placeholder={`Chave de API do ${integ.name}`} />
                </FormField>
              )}
              <FormField label="Webhook URL">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="text" value={`${API_URL}/api/webhooks/${integ.key}`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', flex: 1 }} />
                  <button onClick={() => navigator.clipboard.writeText(`${API_URL}/api/webhooks/${integ.key}`)} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }} title="Copiar">
                    📋
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Configure essa URL no painel da plataforma</p>
              </FormField>
            </div>
          )}
        </div>
      ))}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

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

export default ClientIntegrationsPage;
