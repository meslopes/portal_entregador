import React from 'react';
import { Globe } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api-890250693883.us-central1.run.app';

const integrationToggleStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '0.75rem'
};

const badgeStyle = (bg) => ({
  width: '2rem', height: '2rem', borderRadius: '0.375rem', background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 700
});

const IntegrationCard = ({ config, onChange, integrationKey, label, description, badgeBg, badgeLabel, badgeFontSize, children, wrapperStyle }) => (
  <div style={wrapperStyle}>
    <div style={integrationToggleStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ ...badgeStyle(badgeBg), fontSize: badgeFontSize || '0.625rem' }}>{badgeLabel}</div>
        <div>
          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{label}</p>
          <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{description}</p>
        </div>
      </div>
      <select
        value={config[integrationKey] || 'disabled'}
        onChange={e => onChange(integrationKey, e.target.value)}
        style={{ ...inputStyle, width: 'auto' }}
      >
        <option value="enabled">Ativada</option>
        <option value="disabled">Desativada</option>
      </select>
    </div>
    {config[integrationKey] === 'enabled' && (
      <div style={{ padding: '0 1rem 1rem' }}>{children}</div>
    )}
  </div>
);

const IntegrationSettings = ({ config, onChange }) => (
  <SettingsCard title="Integrações com Plataformas" icon={<Globe size={18} />}>
    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_ifood"
      label="iFood"
      description="Receber pedidos automaticamente"
      badgeBg="#ea1d2c" badgeLabel="iF"
    >
      <FormField label="API Key iFood">
        <input type="password" value={config.ifood_api_key || ''} onChange={e => onChange('ifood_api_key', e.target.value)} style={inputStyle} placeholder="Sua chave de API do iFood" />
      </FormField>
      <FormField label="Webhook URL">
        <input type="text" value={`${API_URL}/api/webhooks/ifood`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Configure essa URL no painel do iFood</p>
      </FormField>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_whatsapp"
      label="WhatsApp"
      description="Notificações e pedidos via WhatsApp"
      badgeBg="#25d366" badgeLabel="WA" badgeFontSize="0.75rem"
    >
      <FormField label="WhatsApp Business API Token">
        <input type="password" value={config.whatsapp_api_token || ''} onChange={e => onChange('whatsapp_api_token', e.target.value)} style={inputStyle} placeholder="Token da API WhatsApp Business" />
      </FormField>
      <FormField label="Número de Origem">
        <input type="text" value={config.whatsapp_phone || ''} onChange={e => onChange('whatsapp_phone', e.target.value)} style={inputStyle} placeholder="+5500000000000" />
      </FormField>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_asaas"
      label="Asaas (Gateway de Pagamento)"
      description="Cobranças PIX, boleto e cartão • Saques automáticos"
      badgeBg="#16a34a" badgeLabel="$" badgeFontSize="0.75rem"
    >
      <FormField label="API Key Asaas">
        <input type="password" value={config.asaas_api_key || ''} onChange={e => onChange('asaas_api_key', e.target.value)} style={inputStyle} placeholder="Sua API Key do Asaas" />
      </FormField>
      <FormField label="Ambiente">
        <select value={config.asaas_environment || 'sandbox'} onChange={e => onChange('asaas_environment', e.target.value)} style={inputStyle}>
          <option value="sandbox">Sandbox (testes)</option>
          <option value="production">Produção</option>
        </select>
      </FormField>
      <FormField label="Webhook URL">
        <input type="text" value={`${API_URL}/api/webhooks/asaas`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Configure essa URL no painel do Asaas</p>
      </FormField>
      <FormField label="Webhook Token">
        <input type="password" value={config.asaas_webhook_token || ''} onChange={e => onChange('asaas_webhook_token', e.target.value)} style={inputStyle} placeholder="Token definido no painel do Asaas" />
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Token de autenticação do webhook (deixe vazio para aceitar qualquer requisição)</p>
      </FormField>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_google_maps"
      label="Google Maps API (Geocoding)"
      description="Endereços precisos para cálculo de frete • Recomendado para produção"
      badgeBg="#4285f4" badgeLabel="G" badgeFontSize="0.75rem"
    >
      <FormField label="Google Maps API Key">
        <input type="password" value={config.google_maps_api_key || ''} onChange={e => onChange('google_maps_api_key', e.target.value)} style={inputStyle} placeholder="Sua API Key do Google Maps" />
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Obtenha em: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>console.cloud.google.com</a> → APIs → Geocoding API
        </p>
      </FormField>
      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: '0.75rem', color: '#1e40af' }}>
          <strong>Custo:</strong> ~$5 por 1.000 consultas. Para 100 pedidos/dia = ~R$ 75/mês.
        </p>
        <p style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.25rem' }}>
          <strong>Benefício:</strong> Endereços sempre corretos, sem precisar ajustar pino no mapa.
        </p>
      </div>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_99food"
      label="99Food"
      description="Receber pedidos automaticamente"
      badgeBg="#ff6600" badgeLabel="99" badgeFontSize="0.5rem"
    >
      <FormField label="API Key 99Food">
        <input type="password" value={config.food99_api_key || ''} onChange={e => onChange('food99_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do 99Food" />
      </FormField>
      <FormField label="Webhook URL">
        <input type="text" value={`${API_URL}/api/webhooks/99food`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
      </FormField>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_instadelivery"
      label="InstaDelivery"
      description="Receber pedidos automaticamente"
      badgeBg="#ff4500" badgeLabel="ID" badgeFontSize="0.5rem"
      wrapperStyle={{ marginTop: '1rem' }}
    >
      <FormField label="API Key InstaDelivery">
        <input type="password" value={config.instadelivery_api_key || ''} onChange={e => onChange('instadelivery_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do InstaDelivery" />
      </FormField>
      <FormField label="Webhook URL">
        <input type="text" value={`${API_URL}/api/webhooks/instadelivery`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
      </FormField>
    </IntegrationCard>

    <IntegrationCard
      config={config} onChange={onChange}
      integrationKey="integration_saipos"
      label="SaiPos"
      description="Receber pedidos automaticamente"
      badgeBg="#00a651" badgeLabel="SP" badgeFontSize="0.5rem"
      wrapperStyle={{ marginTop: '1rem' }}
    >
      <FormField label="API Key SaiPos">
        <input type="password" value={config.saipos_api_key || ''} onChange={e => onChange('saipos_api_key', e.target.value)} style={inputStyle} placeholder="Chave de API do SaiPos" />
      </FormField>
      <FormField label="Webhook URL">
        <input type="text" value={`${API_URL}/api/webhooks/saipos`} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
      </FormField>
    </IntegrationCard>

    <div style={{ marginTop: '1rem' }}>
      <div style={integrationToggleStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ ...badgeStyle('#666'), fontSize: '0.5rem' }}>+</div>
          <div>
            <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>Outras Plataformas</p>
            <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>LoopFood, Goomer, etc.</p>
          </div>
        </div>
        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>Em breve</span>
      </div>
    </div>
  </SettingsCard>
);

export default IntegrationSettings;
