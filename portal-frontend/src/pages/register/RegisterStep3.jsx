import React from 'react';
import { ArrowLeft, Check, Loader, MapPin } from 'lucide-react';

const RegisterStep3 = ({
  formData, handleChange,
  squares, locationStatus, nearestSquare,
  setNearestSquare, setLocationStatus,
  isLoading, prevStep,
}) => (
  <div className="auth-animate-in">
    <div style={{ marginBottom: '1rem' }}>
      <label className="auth-form-label">Praça de Atuação</label>
      {locationStatus === 'detecting' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8125rem', color: '#2563eb' }}>
          <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Detectando sua localização...
        </div>
      )}
      {locationStatus === 'found' && nearestSquare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8125rem', color: '#16a34a' }}>
          <MapPin size={14} /> Praça detectada: <strong>{nearestSquare.name}</strong>
        </div>
      )}
      {locationStatus === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8125rem', color: '#92400e' }}>
          Não foi possível detectar. Selecione manualmente:
        </div>
      )}
      <select
        name="square_id"
        className="auth-form-input"
        value={formData.square_id}
        onChange={(e) => {
          handleChange(e);
          const sq = squares.find(s => s.id === parseInt(e.target.value));
          setNearestSquare(sq || null);
          if (sq) setLocationStatus('found');
        }}
        style={{ cursor: 'pointer' }}
      >
        <option value="">
          {locationStatus === 'detecting' ? 'Detectando...' : 'Selecione sua região'}
        </option>
        {squares.map(sq => (
          <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}/{sq.state}</option>
        ))}
      </select>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
        Selecione a região onde pretende realizar entregas
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <label className="auth-form-label">Tipo de Veículo *</label>
        <select name="vehicle_type" className="auth-form-input" value={formData.vehicle_type}
          onChange={handleChange} required style={{ cursor: 'pointer' }}>
          <option value="">Selecione</option>
          <option value="MOTORCYCLE">Moto</option>
          <option value="CAR">Carro</option>
          <option value="BICYCLE">Bicicleta</option>
          <option value="FOOT">A pé</option>
        </select>
      </div>
      <div>
        <label className="auth-form-label">Placa</label>
        <input name="vehicle_plate" className="auth-form-input" placeholder="ABC-1234"
          value={formData.vehicle_plate} onChange={handleChange} />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <label className="auth-form-label">Modelo</label>
        <input name="vehicle_model" className="auth-form-input" placeholder="Ex: Honda CG 160"
          value={formData.vehicle_model} onChange={handleChange} />
      </div>
      <div>
        <label className="auth-form-label">Ano</label>
        <input type="number" name="vehicle_year" className="auth-form-input" placeholder="2020"
          value={formData.vehicle_year} onChange={handleChange} />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
      <div>
        <label className="auth-form-label">CNH</label>
        <input name="driver_license" className="auth-form-input" placeholder="Número da CNH"
          value={formData.driver_license} onChange={handleChange} />
      </div>
      <div>
        <label className="auth-form-label">Chave PIX</label>
        <input name="pix_key" className="auth-form-input" placeholder="CPF, email ou telefone"
          value={formData.pix_key} onChange={handleChange} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <button type="button" className="auth-btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
        <ArrowLeft size={18} /> Voltar
      </button>
      <button type="submit" className="auth-btn-primary" disabled={isLoading} style={{ flex: 2 }}>
        {isLoading ? (
          <>
            <div style={{
              width: '1rem', height: '1rem',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            Criando conta...
          </>
        ) : (
          <>Criar Conta <Check size={18} /></>
        )}
      </button>
    </div>
  </div>
);

export default RegisterStep3;
