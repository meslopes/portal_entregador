import React from 'react';
import { Bell } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

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

export default NotificationSettings;
