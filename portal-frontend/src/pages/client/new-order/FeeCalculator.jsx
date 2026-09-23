import React from 'react';
import { Bike, Map } from 'lucide-react';

const FeeCalculator = ({
  pricingTable,
  pricePerKm,
  minDistanceKm,
  estimatedFee,
  pinLocation,
  previewMapRef,
  calculatingFee,
  calculateFee,
  pinAdjusted,
  handleResetPin,
  onOpenPinMap,
}) => (
  <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <Bike size={16} style={{ color: '#0d9488' }} />
      <span style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.875rem' }}>Valor da Entrega</span>
      {pricingTable && (
        <span style={{ marginLeft: 'auto', padding: '0.125rem 0.5rem', background: '#dbeafe', borderRadius: '9999px', fontSize: '0.625rem', color: '#2563eb', fontWeight: 600 }}>
          {pricingTable.name}
        </span>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', color: '#475569' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Preço por km</span>
        <span>R$ {pricePerKm.toFixed(2).replace('.', ',')}/km</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Distância mínima</span>
        <span>{minDistanceKm} km</span>
      </div>
      {estimatedFee ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Distância calculada</span>
            <span>{estimatedFee.distance_km?.toFixed(1)} km</span>
          </div>
          {estimatedFee.duration_min > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tempo estimado</span>
              <span>{Math.round(estimatedFee.duration_min)} min</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f766e', borderTop: '1px solid #99f6e4', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}>
            <span>Frete</span>
            <span>R$ {estimatedFee.delivery_fee?.toFixed(2).replace('.', ',')}</span>
          </div>
          <div style={{ fontSize: '0.625rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.25rem' }}>
            {estimatedFee.distance_source === 'osrm' ? 'Distância real (rota)' : 'Distância estimada (linha reta)'}
          </div>
          {pinLocation && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                <Map size={12} style={{ color: '#0d9488' }} />
                <span style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 500 }}>Localização no mapa</span>
              </div>
              <div
                ref={previewMapRef}
                style={{ height: '150px', borderRadius: '0.375rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                onClick={onOpenPinMap}
              />
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.25rem' }}>
                Clique no mapa para ajustar o local
              </p>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f766e', borderTop: '1px solid #99f6e4', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
          <span>Frete</span>
          <span>Preencha o endereço e clique calcular</span>
        </div>
      )}
    </div>
    {!pinAdjusted ? (
      <button
        type="button"
        onClick={calculateFee}
        disabled={calculatingFee}
        style={{
          width: '100%', marginTop: '0.75rem', padding: '0.5rem', borderRadius: '0.375rem',
          border: 'none', background: calculatingFee ? '#94a3b8' : '#0d9488', color: 'white',
          fontSize: '0.8125rem', fontWeight: 600, cursor: calculatingFee ? 'not-allowed' : 'pointer'
        }}
      >
        {calculatingFee ? 'Calculando...' : 'Calcular Frete'}
      </button>
    ) : (
      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#dcfce7', borderRadius: '0.375rem', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 500 }}>✓ Local confirmado no mapa</span>
        <button type="button" onClick={handleResetPin} style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Recalcular
        </button>
      </div>
    )}
    {estimatedFee && pinLocation && (
      <button
        type="button"
        onClick={onOpenPinMap}
        style={{
          width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem',
          border: '1.5px solid #2563eb', background: 'white', color: '#2563eb',
          fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}
      >
        <Map size={14} /> {pinAdjusted ? 'Ajustar Novamente' : 'Ajustar Local no Mapa'}
      </button>
    )}
  </div>
);

export default FeeCalculator;
