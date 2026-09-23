import React from 'react';
import { DollarSign } from 'lucide-react';
import { SettingsCard, FormField, inputStyle } from './shared';

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
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Percentual retido sobre o frete de cada entrega</p>
    </FormField>
    <FormField label="Entregador recebe (%)">
      <input type="number" min="0" max="100" value={config.driver_percentage || '65'} onChange={e => onChange('driver_percentage', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Percentual do frete que vai para o entregador (padrão: 65%)</p>
    </FormField>
    <FormField label="Gamificação (%)">
      <input type="number" min="0" max="30" value={config.gamification_percentage || '5'} onChange={e => onChange('gamification_percentage', e.target.value)} style={inputStyle} />
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Percentual destinado ao pool de gamificação/ranking (padrão: 5%)</p>
    </FormField>
    <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe', marginTop: '0.5rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#1e40af' }}>
        <strong>Total:</strong> Admin ({config.commission_rate || '30'}%) + Entregador ({config.driver_percentage || '65'}%) + Gamificação ({config.gamification_percentage || '5'}%) = 100%
      </p>
    </div>
  </SettingsCard>
);

export default PricingSettings;
