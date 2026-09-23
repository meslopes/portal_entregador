import React from 'react';
import { User } from 'lucide-react';
import { Card, Label, inputStyle } from './shared';

const CustomerFields = ({ form, handleChange }) => (
  <Card title="Dados do Cliente" icon={<User size={16} />}>
    <Label>Nome do Cliente *</Label>
    <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Ex: Seu Jair das Quantas" required style={inputStyle} />
    <Label>Telefone *</Label>
    <input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="(51) 99999-9999" required style={inputStyle} />
  </Card>
);

export default CustomerFields;
