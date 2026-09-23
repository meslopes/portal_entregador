import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Globe, FileText, Loader2
} from 'lucide-react';
import { adminService } from '@/lib/api';
import LogoUpload from './white-label/LogoUpload';
import ColorPicker from './white-label/ColorPicker';
import SectionCard from './white-label/SectionCard';

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
  color: '#374151', marginBottom: '0.375rem'
};

const AdminWhiteLabelPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenant, setTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#6366f1',
    secondary_color: '#ffffff',
    phone: '',
    email: '',
    address: '',
    cnpj: '',
    terms_url: '',
    privacy_url: '',
    custom_domain: ''
  });

  useEffect(() => {
    loadTenantSettings();
  }, []);

  const loadTenantSettings = async () => {
    try {
      setLoading(true);
      const data = await adminService.getTenantSettings();
      setTenant(data.tenant);
      setFormData({
        name: data.tenant.name || '',
        primary_color: data.tenant.primary_color || '#6366f1',
        secondary_color: data.tenant.secondary_color || '#ffffff',
        phone: data.tenant.phone || '',
        email: data.tenant.email || '',
        address: data.tenant.address || '',
        cnpj: data.tenant.cnpj || '',
        terms_url: data.tenant.terms_url || '',
        privacy_url: data.tenant.privacy_url || '',
        custom_domain: data.tenant.custom_domain || ''
      });
    } catch (err) {
      setError('Erro ao carregar configurações');
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

      const data = await adminService.updateTenantSettings(formData);
      setTenant(data.tenant);
      setSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao salvar configurações');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        const data = await adminService.uploadTenantLogo(base64, file.name);
        setTenant(prev => ({ ...prev, logo_url: data.logo_url }));
        setSuccess('Logo atualizado com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao fazer upload do logo');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/admin/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            border: '1px solid #e2e8f0', background: 'white',
            cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Configurações de White-Label
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Personalize a aparência da sua organização
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
          padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          {success}
        </div>
      )}

      {/* Logo Section */}
      <LogoUpload
        logoUrl={tenant?.logo_url}
        onUpload={handleLogoUpload}
      />

      {/* Colors Section */}
      <ColorPicker
        primaryColor={formData.primary_color}
        secondaryColor={formData.secondary_color}
        onPrimaryChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
        onSecondaryChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
      />

      {/* Organization Info */}
      <SectionCard icon={Globe} title="Informações da Organização">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Nome da Organização</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
              placeholder="Ex: muvy"
            />
          </div>

          <div>
            <label style={labelStyle}>CNPJ</label>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
              style={inputStyle}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              style={inputStyle}
              placeholder="(51) 99999-9999"
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              style={inputStyle}
              placeholder="contato@empresa.com"
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Endereço</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            style={inputStyle}
            placeholder="Rua, número - Bairro, Cidade - UF"
          />
        </div>
      </SectionCard>

      {/* Domain Section */}
      <SectionCard icon={Globe} title="Domínio Personalizado">
        <div>
          <label style={labelStyle}>Domínio Próprio</label>
          <input
            type="text"
            value={formData.custom_domain}
            onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
            style={inputStyle}
            placeholder="app.suaempresa.com.br"
          />
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Configure um domínio personalizado para o portal do cliente
          </p>
        </div>
      </SectionCard>

      {/* Legal Links */}
      <SectionCard icon={FileText} title="Links Legais">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>URL dos Termos de Uso</label>
            <input
              type="url"
              value={formData.terms_url}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_url: e.target.value }))}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>

          <div>
            <label style={labelStyle}>URL da Política de Privacidade</label>
            <input
              type="url"
              value={formData.privacy_url}
              onChange={(e) => setFormData(prev => ({ ...prev, privacy_url: e.target.value }))}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => navigate('/admin/settings')}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
            border: '1px solid #e2e8f0', background: 'white',
            cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
            border: 'none', background: '#6366f1', color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem', fontWeight: 500,
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} /> Salvar Configurações
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminWhiteLabelPage;
