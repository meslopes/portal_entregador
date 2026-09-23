import React from 'react';
import { CreditCard } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

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

export default PaymentSettings;
