import React from 'react';
import { Store } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

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
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Se desativado, o estabelecimento não poderá cancelar pedidos. Apenas o admin terá essa permissão.</p>
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
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Período considerado para cada fatura semanal</p>
    </FormField>
  </SettingsCard>
);

export default EstablishmentSettings;
