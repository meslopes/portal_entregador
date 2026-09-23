import React from 'react';
import { Save } from 'lucide-react';
import { cardStyle, inputStyle, saveBtnStyle, FormField } from './shared';

const selectStyle = {
  ...inputStyle, background: 'white',
};
const gridStyle = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem',
};

const VehicleInfoCard = ({ vehicleData, setVehicleData, onSave, isSaving }) => (
  <div style={cardStyle}>
    <FormField label="Tipo de Veículo">
      <select
        value={vehicleData.vehicle_type}
        onChange={e => setVehicleData({ ...vehicleData, vehicle_type: e.target.value })}
        style={selectStyle}
      >
        <option value="MOTORCYCLE">Moto</option>
        <option value="CAR">Carro</option>
        <option value="BICYCLE">Bicicleta</option>
        <option value="FOOT">A pé</option>
      </select>
    </FormField>

    <div style={gridStyle}>
      <FormField label="Placa">
        <input
          type="text"
          value={vehicleData.vehicle_plate}
          onChange={e => setVehicleData({ ...vehicleData, vehicle_plate: e.target.value.toUpperCase() })}
          placeholder="ABC-1234"
          style={{ ...inputStyle, textTransform: 'uppercase' }}
        />
      </FormField>
      <FormField label="Modelo">
        <input
          type="text"
          value={vehicleData.vehicle_model}
          onChange={e => setVehicleData({ ...vehicleData, vehicle_model: e.target.value })}
          placeholder="Ex: Honda CG 160"
          style={inputStyle}
        />
      </FormField>
    </div>

    <FormField label="Ano">
      <input
        type="number"
        value={vehicleData.vehicle_year}
        onChange={e => setVehicleData({ ...vehicleData, vehicle_year: e.target.value })}
        placeholder="Ex: 2023"
        style={inputStyle}
      />
    </FormField>

    <FormField label="Chave PIX">
      <input
        type="text"
        value={vehicleData.pix_key}
        onChange={e => setVehicleData({ ...vehicleData, pix_key: e.target.value })}
        placeholder="Sua chave PIX (CPF, email ou telefone)"
        style={inputStyle}
      />
    </FormField>

    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block', fontSize: '0.8125rem', fontWeight: 500,
        color: '#374151', marginBottom: '0.375rem',
      }}>Dados Bancários (opcional)</label>
      <input
        type="text"
        value={vehicleData.bank_account}
        onChange={e => setVehicleData({ ...vehicleData, bank_account: e.target.value })}
        placeholder="Agência + Conta"
        style={inputStyle}
      />
    </div>

    <button onClick={onSave} disabled={isSaving} style={saveBtnStyle(isSaving)}>
      <Save size={18} />
      {isSaving ? 'Salvando...' : 'Salvar Veículo'}
    </button>
  </div>
);

export default VehicleInfoCard;
