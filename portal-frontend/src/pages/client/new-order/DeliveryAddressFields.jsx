import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, Label } from './shared';
import { inputStyle } from './shared.constants';
import FeeCalculator from './FeeCalculator';

const DeliveryAddressFields = ({ form, handleChange, feeCalculatorProps }) => (
  <Card title="Endereço de Entrega" icon={<MapPin size={16} />}>
    <Label>Endereço/Rua *</Label>
    <input name="delivery_address" value={form.delivery_address} onChange={handleChange} placeholder="Rua, avenida, travessa..." required style={inputStyle} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
      <div><Label>Número *</Label><input name="delivery_number" value={form.delivery_number} onChange={handleChange} placeholder="Nº" required style={inputStyle} /></div>
      <div><Label>Complemento</Label><input name="delivery_complement" value={form.delivery_complement} onChange={handleChange} placeholder="Casa 2, Apto 506" style={inputStyle} /></div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
      <div><Label>Bairro *</Label><input name="delivery_neighborhood" value={form.delivery_neighborhood} onChange={handleChange} placeholder="Bairro" required style={inputStyle} /></div>
      <div><Label>CEP</Label><input name="delivery_zip_code" value={form.delivery_zip_code} onChange={handleChange} placeholder="95555-000" style={inputStyle} /></div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
      <div><Label>Cidade</Label><input name="delivery_city" value={form.delivery_city} onChange={handleChange} style={inputStyle} /></div>
      <div><Label>Estado</Label><input name="delivery_state" value={form.delivery_state} onChange={handleChange} style={inputStyle} /></div>
    </div>

    <FeeCalculator {...feeCalculatorProps} />
  </Card>
);

export default DeliveryAddressFields;
