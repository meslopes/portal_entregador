import React from 'react';
import { Building2 } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

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

export default CompanySettings;
