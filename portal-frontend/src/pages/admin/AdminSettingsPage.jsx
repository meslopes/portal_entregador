import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Save, AlertCircle, CheckCircle, CreditCard,
  Building2, Bike, Store, DollarSign, Clock, Shield,
  Bell, Globe, Users, MapPin, Package, Zap, ChevronRight, Mail, Palette
} from 'lucide-react';

import api from '@/lib/api';
import CompanySettings from './admin-settings/CompanySettings';
import EmailSettings from './admin-settings/EmailSettings';
import PaymentSettings from './admin-settings/PaymentSettings';
import PricingSettings from './admin-settings/PricingSettings';
import DeliverySettings from './admin-settings/DeliverySettings';
import DriverSettings from './admin-settings/DriverSettings';
import EstablishmentSettings from './admin-settings/EstablishmentSettings';
import NotificationSettings from './admin-settings/NotificationSettings';
import IntegrationSettings from './admin-settings/IntegrationSettings';

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeModule, setActiveModule] = useState('company');
  const [config, setConfig] = useState({});

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/settings');
      setConfig(response.data);
    } catch (err) {
      console.error('Erro ao carregar config:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.put('/api/admin/settings', config);
      if (response.status === 200) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const modules = [
    { key: 'company', label: 'Empresa', icon: Building2, color: '#2563eb' },
    { key: 'payment', label: 'Pagamento', icon: CreditCard, color: '#16a34a' },
    { key: 'email', label: 'E-mail', icon: Mail, color: '#ea580c' },
    { key: 'pricing', label: 'Preços', icon: DollarSign, color: '#d97706' },
    { key: 'delivery', label: 'Entregas', icon: Bike, color: '#8b5cf6' },
    { key: 'drivers', label: 'Entregadores', icon: Users, color: '#0d9488' },
    { key: 'establishments', label: 'Estabelecimentos', icon: Store, color: '#06b6d4' },
    { key: 'notifications', label: 'Notificações', icon: Bell, color: '#f59e0b' },
    { key: 'integrations', label: 'Integrações', icon: Globe, color: '#ec4899' },
    { key: 'white-label', label: 'White-Label', icon: Palette, color: '#6366f1', link: '/admin/white-label' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Configurações</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie as configurações do sistema</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white',
          fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1
        }}>
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Tudo'}
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

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem' }} className="settings-grid">
        {/* Menu lateral */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '0.5rem', alignSelf: 'start' }}>
          {modules.map(mod => {
            const Icon = mod.icon;
            const active = activeModule === mod.key;
            return (
              <button key={mod.key} onClick={() => mod.link ? navigate(mod.link) : setActiveModule(mod.key)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none',
                background: active ? `${mod.color}10` : 'transparent',
                color: active ? mod.color : '#64748b',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                textAlign: 'left', transition: 'all 0.15s'
              }}>
                <Icon size={18} />
                <span style={{ flex: 1 }}>{mod.label}</span>
                <ChevronRight size={14} style={{ opacity: active ? 1 : 0.3 }} />
              </button>
            );
          })}
        </div>

        {/* Conteudo */}
        <div>
          {activeModule === 'company' && <CompanySettings config={config} onChange={handleChange} />}
          {activeModule === 'email' && <EmailSettings config={config} onChange={handleChange} />}
          {activeModule === 'payment' && <PaymentSettings config={config} onChange={handleChange} />}
          {activeModule === 'pricing' && <PricingSettings config={config} onChange={handleChange} />}
          {activeModule === 'delivery' && <DeliverySettings config={config} onChange={handleChange} />}
          {activeModule === 'drivers' && <DriverSettings config={config} onChange={handleChange} />}
          {activeModule === 'establishments' && <EstablishmentSettings config={config} onChange={handleChange} />}
          {activeModule === 'notifications' && <NotificationSettings config={config} onChange={handleChange} />}
          {activeModule === 'integrations' && <IntegrationSettings config={config} onChange={handleChange} />}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .settings-grid { grid-template-columns: 250px 1fr; }
        @media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default AdminSettingsPage;
