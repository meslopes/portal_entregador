import React, { useState, useEffect } from 'react';
import {
  Settings, Save, AlertCircle, CheckCircle, CreditCard,
  Building2, Truck, Store, DollarSign, Clock, Shield,
  Bell, Globe, Users, MapPin, Package, Zap, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';

const AdminSettingsPage = () => {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
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
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
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

  const modules = [
    { key: 'company', label: 'Empresa', icon: Building2, color: '#2563eb' },
    { key: 'payment', label: 'Pagamento', icon: CreditCard, color: '#16a34a' },
    { key: 'email', label: 'E-mail', icon: Mail, color: '#ea580c' },
    { key: 'pricing', label: 'Preços', icon: DollarSign, color: '#d97706' },
    { key: 'delivery', label: 'Entregas', icon: Truck, color: '#8b5cf6' },
    { key: 'drivers', label: 'Entregadores', icon: Users, color: '#0d9488' },
    { key: 'establishments', label: 'Estabelecimentos', icon: Store, color: '#06b6d4' },
    { key: 'notifications', label: 'Notificações', icon: Bell, color: '#f59e0b' },
    { key: 'integrations', label: 'Integrações', icon: Globe, color: '#ec4899' },
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
              <button key={mod.key} onClick={() => setActiveModule(mod.key)} style={{
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

// Empresa
const CompanySettings = ({ config, onChange }) => (
  <SettingsCard title="Dados da Empresa" icon={<Building2 size={18} />}>
    <FormField label="Nome da Empresa">
      <input type="text" value={config.admin_company_name || ''} onChange={e => onChange('admin_company_name', e.target.value)} style={inputStyle} placeholder="Muv.log Entregas" />
    </FormField>
    <FormField label="CNPJ">
      <input type="text" value={config.admin_cnpj || ''} onChange={e => onChange('admin_cnpj', e.target.value)} style={inputStyle} placeholder="00.000.000/0001-00" />
    </FormField>
    <FormField label="Telefone">
      <input type="text" value={config.admin_phone || ''} onChange={e => onChange('admin_phone', e.target.value)} style={inputStyle} placeholder="(00) 00000-0000" />
    </FormField>
    <FormField label="E-mail">
      <input type="email" value={config.admin_email || ''} onChange={e => onChange('admin_email', e.target.value)} style={inputStyle} placeholder="contato@muvlog.com.br" />
    </FormField>
    <FormField label="Endereço">
      <input type="text" value={config.admin_address || ''} onChange={e => onChange('admin_address', e.target.value)} style={inputStyle} placeholder="Rua, número, bairro, cidade - UF" />
    </FormField>
  </SettingsCard>
);

// E-mail (SendGrid)
const EmailSettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações de E-mail (SendGrid)" icon={<Mail size={18} />}>
    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
      Configure o SendGrid para enviar e-mails de confirmação de cadastro, boas-vindas e notificações.
      Obtenha sua API Key em <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" style={{ color: '#2563eb' }}>sendgrid.com</a> (100 e-mails grátis/dia).
    </p>
    <FormField label="API Key SendGrid">
      <input type="password" value={config.sendgrid_api_key || ''} onChange={e => onChange('sendgrid_api_key', e.target.value)} style={inputStyle} placeholder="SG.xxxxxxxxxxxxxxxxxxxx" />
    </FormField>
    <FormField label="E-mail de Origem">
      <input type="email" value={config.sendgrid_from_email || ''} onChange={e => onChange('sendgrid_from_email', e.target.value)} style={inputStyle} placeholder="noreply@muvlog.com.br" />
    </FormField>
    <FormField label="Nome de Origem">
      <input type="text" value={config.sendgrid_from_name || ''} onChange={e => onChange('sendgrid_from_name', e.target.value)} style={inputStyle} placeholder="muv.log" />
    </FormField>
    <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', borderLeft: '3px solid #2563eb' }}>
      <p style={{ fontSize: '0.8125rem', color: '#1e40af' }}>
        <strong>Como configurar:</strong>
      </p>
      <ol style={{ fontSize: '0.8125rem', color: '#1e40af', margin: '0.5rem 0 0 1.25rem', paddingLeft: '1.25rem' }}>
        <li>Acesse <a href="https://app.sendgrid.com" target="_blank" style={{ color: '#2563eb' }}>app.sendgrid.com</a></li>
        <li>Vá em Settings → API Keys → Create API Key</li>
        <li>Cole a API Key acima</li>
        <li>Configure o e-mail de origem (deve ser de um dominio verificado)</li>
      </ol>
    </div>
  </SettingsCard>
);

// Pagamento
const PaymentSettings = ({ config, onChange }) => (
  <SettingsCard title="Dados Bancários (para QR Code)" icon={<CreditCard size={18} />}>
    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
      Esses dados são utilizados para gerar os QR Codes nas faturas digitais.
    </p>
    <FormField label="Banco">
      <input type="text" value={config.admin_bank_name || ''} onChange={e => onChange('admin_bank_name', e.target.value)} style={inputStyle} placeholder="Banco do Brasil" />
    </FormField>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <FormField label="Agência">
        <input type="text" value={config.admin_bank_agency || ''} onChange={e => onChange('admin_bank_agency', e.target.value)} style={inputStyle} placeholder="0000-0" />
      </FormField>
      <FormField label="Conta">
        <input type="text" value={config.admin_bank_account || ''} onChange={e => onChange('admin_bank_account', e.target.value)} style={inputStyle} placeholder="00000-0" />
      </FormField>
    </div>
    <FormField label="Chave PIX">
      <input type="text" value={config.admin_bank_pix_key || ''} onChange={e => onChange('admin_bank_pix_key', e.target.value)} style={inputStyle} placeholder="CNPJ, email ou chave aleatória" />
    </FormField>
  </SettingsCard>
);

// Preços
const PricingSettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações de Preços" icon={<DollarSign size={18} />}>
    <FormField label="Preço por KM (R$)">
      <input type="number" step="0.01" value={config.delivery_price_per_km || '2.95'} onChange={e => onChange('delivery_price_per_km', e.target.value)} style={inputStyle} />
    </FormField>
    <FormField label="Taxa Mínima de Entrega (R$)">
      <input type="number" step="0.01" value={config.delivery_min_fee || '5.00'} onChange={e => onChange('delivery_min_fee', e.target.value)} style={inputStyle} />
    </FormField>
    <FormField label="Taxa Máxima de Entrega (R$)">
      <input type="number" step="0.01" value={config.delivery_max_fee || '50.00'} onChange={e => onChange('delivery_max_fee', e.target.value)} style={inputStyle} />
    </FormField>
    <FormField label="Comissão do Admin (%)">
      <input type="number" min="0" max="50" value={config.commission_rate || '30'} onChange={e => onChange('commission_rate', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Percentual retido sobre o frete de cada entrega</p>
    </FormField>
    <FormField label="Bônus por KM (R$)">
      <input type="number" step="0.01" value={config.driver_km_bonus || '0.50'} onChange={e => onChange('driver_km_bonus', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Valor extra pago ao entregador por km percorrido</p>
    </FormField>
  </SettingsCard>
);

// Entregas
const DeliverySettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações de Entregas" icon={<Truck size={18} />}>
    <FormField label="Raio Máximo de Busca (km)">
      <input type="number" value={config.delivery_radius || '200'} onChange={e => onChange('delivery_radius', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Distância máxima para buscar entregadores disponíveis</p>
    </FormField>
    <FormField label="Timeout para Notificar Admin (segundos)">
      <input type="number" value={config.order_timeout_seconds || '120'} onChange={e => onChange('order_timeout_seconds', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Tempo máximo sem atendimento antes de notificar o admin via mensagem e alerta sonoro (padrão: 120s = 2 minutos)</p>
    </FormField>
    <FormField label="Auto-atribuição de Pedidos">
      <select value={config.auto_assign || 'true'} onChange={e => onChange('auto_assign', e.target.value)} style={inputStyle}>
        <option value="true">Ativada (sistema busca entregador automaticamente)</option>
        <option value="false">Desativada (admin atribui manualmente)</option>
      </select>
    </FormField>
    <FormField label="Status do Sistema">
      <select value={config.system_status || 'active'} onChange={e => onChange('system_status', e.target.value)} style={inputStyle}>
        <option value="active">Ativo</option>
        <option value="maintenance">Manutenção</option>
        <option value="closed">Fechado</option>
      </select>
    </FormField>
  </SettingsCard>
);

// Entregadores
const DriverSettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações dos Entregadores" icon={<Users size={18} />}>
    <FormField label="Aprovação Automática">
      <select value={config.auto_approve_drivers || 'false'} onChange={e => onChange('auto_approve_drivers', e.target.value)} style={inputStyle}>
        <option value="true">Ativada (entregador é aprovado automaticamente)</option>
        <option value="false">Desativada (admin aprova manualmente)</option>
      </select>
    </FormField>
    <FormField label="Avaliação Mínima para Continuar">
      <input type="number" min="0" max="5" step="0.5" value={config.min_driver_rating || '2.0'} onChange={e => onChange('min_driver_rating', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Avaliação mínima para o entregador continuar recebendo pedidos</p>
    </FormField>
    <FormField label="Atualização de Localização (segundos)">
      <input type="number" value={config.location_update_interval || '30'} onChange={e => onChange('location_update_interval', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Intervalo para o entregador enviar sua localização</p>
    </FormField>
    <FormField label="Horário de Funcionamento">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Abertura</label>
          <input type="time" value={config.driver_start_time || '08:00'} onChange={e => onChange('driver_start_time', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fechamento</label>
          <input type="time" value={config.driver_end_time || '22:00'} onChange={e => onChange('driver_end_time', e.target.value)} style={inputStyle} />
        </div>
      </div>
    </FormField>
  </SettingsCard>
);

// Estabelecimentos
const EstablishmentSettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações dos Estabelecimentos" icon={<Store size={18} />}>
    <FormField label="Aprovação Automática">
      <select value={config.auto_approve_establishments || 'false'} onChange={e => onChange('auto_approve_establishments', e.target.value)} style={inputStyle}>
        <option value="true">Ativada</option>
        <option value="false">Desativada (admin aprova manualmente)</option>
      </select>
    </FormField>
    <FormField label="Permitir Cancelamento pelo Estabelecimento">
      <select value={config.allow_establishment_cancel || 'true'} onChange={e => onChange('allow_establishment_cancel', e.target.value)} style={inputStyle}>
        <option value="true">Permitido (estabelecimento pode cancelar pedidos)</option>
        <option value="false">Não permitido (apenas admin pode cancelar)</option>
      </select>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Se desativado, o estabelecimento não poderá cancelar pedidos. Apenas o admin terá essa permissão.</p>
    </FormField>
    <FormField label="Cobrança Semanal">
      <select value={config.weekly_billing || 'true'} onChange={e => onChange('weekly_billing', e.target.value)} style={inputStyle}>
        <option value="true">Ativada (faturas geradas toda segunda-feira)</option>
        <option value="false">Desativada</option>
      </select>
    </FormField>
    <FormField label="Horário de Geração de Faturas">
      <input type="time" value={config.billing_time || '07:30'} onChange={e => onChange('billing_time', e.target.value)} style={inputStyle} />
    </FormField>
    <FormField label="Dias de Cobrança">
      <input type="text" value={config.billing_days || 'segunda a domingo'} onChange={e => onChange('billing_days', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Período considerado para cada fatura semanal</p>
    </FormField>
  </SettingsCard>
);

// Notificações
const NotificationSettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações de Notificações" icon={<Bell size={18} />}>
    <FormField label="Notificações por E-mail">
      <select value={config.email_notifications || 'true'} onChange={e => onChange('email_notifications', e.target.value)} style={inputStyle}>
        <option value="true">Ativadas</option>
        <option value="false">Desativadas</option>
      </select>
    </FormField>
    <FormField label="Notificação de Novo Pedido">
      <select value={config.notify_new_order || 'true'} onChange={e => onChange('notify_new_order', e.target.value)} style={inputStyle}>
        <option value="true">Ativada</option>
        <option value="false">Desativada</option>
      </select>
    </FormField>
    <FormField label="Notificação de Cancelamento">
      <select value={config.notify_cancellation || 'true'} onChange={e => onChange('notify_cancellation', e.target.value)} style={inputStyle}>
        <option value="true">Ativada</option>
        <option value="false">Desativada</option>
      </select>
    </FormField>
    <FormField label="Notificação de Avaliação Baixa">
      <select value={config.notify_low_rating || 'true'} onChange={e => onChange('notify_low_rating', e.target.value)} style={inputStyle}>
        <option value="true">Ativada (avisa quando entregador recebe nota baixa)</option>
        <option value="false">Desativada</option>
      </select>
    </FormField>
  </SettingsCard>
);

// Integrações
const IntegrationSettings = ({ config, onChange }) => (
  <SettingsCard title="Integrações com Plataformas" icon={<Globe size={18} />}>
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#ea1d2c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.625rem', fontWeight: 700 }}>iF</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>iFood</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Receber pedidos automaticamente</p>
          </div>
        </div>
        <select value={config.integration_ifood || 'disabled'} onChange={e => onChange('integration_ifood', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="enabled">Ativada</option>
          <option value="disabled">Desativada</option>
        </select>
      </div>
      {config.integration_ifood === 'enabled' && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <FormField label="API Key iFood">
            <input type="password" value={config.ifood_api_key || ''} onChange={e => onChange('ifood_api_key', e.target.value)} style={inputStyle} placeholder="Sua chave de API do iFood" />
          </FormField>
          <FormField label="Webhook URL">
            <input type="text" value={`${API_URL}/api/webhooks/ifood`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Configure essa URL no painel do iFood</p>
          </FormField>
        </div>
      )}
    </div>

    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>WA</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>WhatsApp</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Notificações e pedidos via WhatsApp</p>
          </div>
        </div>
        <select value={config.integration_whatsapp || 'disabled'} onChange={e => onChange('integration_whatsapp', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="enabled">Ativada</option>
          <option value="disabled">Desativada</option>
        </select>
      </div>
      {config.integration_whatsapp === 'enabled' && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <FormField label="WhatsApp Business API Token">
            <input type="password" value={config.whatsapp_api_token || ''} onChange={e => onChange('whatsapp_api_token', e.target.value)} style={inputStyle} placeholder="Token da API WhatsApp Business" />
          </FormField>
          <FormField label="Número de Origem">
            <input type="text" value={config.whatsapp_phone || ''} onChange={e => onChange('whatsapp_phone', e.target.value)} style={inputStyle} placeholder="+5500000000000" />
          </FormField>
        </div>
      )}
    </div>

    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#ff6600', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>99</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>99Food</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Receber pedidos automaticamente</p>
          </div>
        </div>
        <select value={config.integration_99food || 'disabled'} onChange={e => onChange('integration_99food', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="enabled">Ativada</option>
          <option value="disabled">Desativada</option>
        </select>
      </div>
      {config.integration_99food === 'enabled' && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <FormField label="API Key 99Food">
            <input type="password" value={config.food99_api_key || ''} onChange={e => onChange('food99_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do 99Food" />
          </FormField>
          <FormField label="Webhook URL">
            <input type="text" value={`${API_URL}/api/webhooks/99food`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
          </FormField>
        </div>
      )}
    </div>

    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#ff4500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>ID</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>InstaDelivery</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Receber pedidos automaticamente</p>
          </div>
        </div>
        <select value={config.integration_instadelivery || 'disabled'} onChange={e => onChange('integration_instadelivery', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="enabled">Ativada</option>
          <option value="disabled">Desativada</option>
        </select>
      </div>
      {config.integration_instadelivery === 'enabled' && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <FormField label="API Key InstaDelivery">
            <input type="password" value={config.instadelivery_api_key || ''} onChange={e => onChange('instadelivery_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do InstaDelivery" />
          </FormField>
          <FormField label="Webhook URL">
            <input type="text" value={`${API_URL}/api/webhooks/instadelivery`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
          </FormField>
        </div>
      )}
    </div>

    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#00a651', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>SP</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>SaiPos</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Receber pedidos automaticamente</p>
          </div>
        </div>
        <select value={config.integration_saipos || 'disabled'} onChange={e => onChange('integration_saipos', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="enabled">Ativada</option>
          <option value="disabled">Desativada</option>
        </select>
      </div>
      {config.integration_saipos === 'enabled' && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <FormField label="API Key SaiPos">
            <input type="password" value={config.saipos_api_key || ''} onChange={e => onChange('saipos_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do SaiPos" />
          </FormField>
          <FormField label="Webhook URL">
            <input type="text" value={`${API_URL}/api/webhooks/saipos`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
          </FormField>
        </div>
      )}
    </div>

    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>+</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>Outras Plataformas</p>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>LoopFood, Goomer, etc.</p>
          </div>
        </div>
        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>Em breve</span>
      </div>
    </div>
  </SettingsCard>
);

// Componentes auxiliares
const SettingsCard = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
