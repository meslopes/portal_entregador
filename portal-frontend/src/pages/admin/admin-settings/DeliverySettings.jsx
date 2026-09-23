import React from 'react';
import { Bike } from 'lucide-react';
import { SettingsCard, FormField, inputStyle } from './shared';

const DeliverySettings = ({ config, onChange }) => (
  <SettingsCard title="Configurações de Entregas" icon={<Bike size={18} />}>
    <FormField label="Raio Máximo de Busca (km)">
      <input type="number" value={config.delivery_radius || '200'} onChange={e => onChange('delivery_radius', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Distância máxima para buscar entregadores disponíveis</p>
    </FormField>
    <FormField label="Raio GPS para Coleta/Entrega (metros)">
      <input type="number" min="50" max="5000" step="50" value={config.gps_radius_meters || '500'} onChange={e => onChange('gps_radius_meters', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Distância máxima que o entregador pode estar do ponto de coleta ou entrega para confirmar o status. Padrão: 500m</p>
    </FormField>
    <FormField label="Timeout para Notificar Admin (segundos)">
      <input type="number" value={config.order_timeout_seconds || '120'} onChange={e => onChange('order_timeout_seconds', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Tempo máximo sem atendimento antes de notificar o admin via mensagem e alerta sonoro (padrão: 120s = 2 minutos)</p>
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

export default DeliverySettings;
