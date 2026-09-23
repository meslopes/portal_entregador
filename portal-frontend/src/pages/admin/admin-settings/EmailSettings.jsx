import React from 'react';
import { Mail } from 'lucide-react';
import { SettingsCard, FormField, inputStyle } from './shared';

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

export default EmailSettings;
