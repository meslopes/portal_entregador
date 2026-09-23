import React from 'react';
import { Users } from 'lucide-react';
import { SettingsCard, FormField } from './shared';
import { inputStyle } from './shared.constants';

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
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Avaliação mínima para o entregador continuar recebendo pedidos</p>
    </FormField>
    <FormField label="Atualização de Localização (segundos)">
      <input type="number" value={config.location_update_interval || '30'} onChange={e => onChange('location_update_interval', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Intervalo para o entregador enviar sua localização</p>
    </FormField>
    <FormField label="Horário de Funcionamento">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Abertura</label>
          <input type="time" value={config.driver_start_time || '08:00'} onChange={e => onChange('driver_start_time', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Fechamento</label>
          <input type="time" value={config.driver_end_time || '22:00'} onChange={e => onChange('driver_end_time', e.target.value)} style={inputStyle} />
        </div>
      </div>
    </FormField>
  </SettingsCard>
);

export default DriverSettings;
