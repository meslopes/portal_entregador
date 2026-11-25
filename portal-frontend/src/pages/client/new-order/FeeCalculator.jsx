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
  manualKm,
  onManualKmChange,
  onApplyManualKm,
  vehicleType,
  onVehicleTypeChange,
  deliveryModel,
  onDeliveryModelChange,
  hasOwnDrivers,
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
      {/* Modelo de entrega — tabela de preço própria vs plataforma */}
      {onDeliveryModelChange && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Modelo de entrega</span>
          <select value={deliveryModel || ''} onChange={(e) => onDeliveryModelChange(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', border: '1.5px solid #99f6e4', borderRadius: '0.375rem', fontSize: '0.8125rem', background: 'white', cursor: 'pointer' }}>
            <option value="">Automático</option>
            {hasOwnDrivers && <option value="OWN">🏍️ Entregador próprio</option>}
            <option value="PLATFORM">🚗 Motorista plataforma</option>
          </select>
        </div>
      )}
      {estimatedFee && (
        <div style={{ fontSize: '0.625rem', color: '#0d9488', margin: 0 }}>
          {estimatedFee.distance_source === 'manual' ? 'Distância informada por você' : estimatedFee.distance_source === 'osrm' ? 'Distância real (rota)' : 'Distância estimada (linha reta)'}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Veículo da entrega</span>
        <select value={vehicleType || 'MOTO'} onChange={(e) => onVehicleTypeChange && onVehicleTypeChange(e.target.value)}
          style={{ padding: '0.25rem 0.5rem', border: '1.5px solid #99f6e4', borderRadius: '0.375rem', fontSize: '0.8125rem', background: 'white', cursor: 'pointer' }}>
          <option value="MOTO">🏍️ Moto</option>
          <option value="BIKE">🚲 Bike</option>
          <option value="CAR">🚗 Carro</option>
        </select>
      </div>
      {vehicleType && vehicleType !== 'MOTO' && (
        <p style={{ fontSize: '0.625rem', color: '#0d9488', margin: 0 }}>
          O multiplicador do veículo será aplicado ao calcular o frete
        </p>
      )}
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
          {/* Distância com correção manual — regra: ninguém sai no prejuízo
              por frete mal calculado (§7.3 do plano de monetização) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span>Distância (km)</span>
            <span style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <input
                type="number" step="0.1" min="0.1" max="200"
                value={manualKm}
                onChange={(e) => onManualKmChange(e.target.value)}
                placeholder={estimatedFee.distance_km?.toFixed(1) ?? ''}
                title="Confira no mapa e corrija se necessário"
                style={{ width: '72px', padding: '0.25rem 0.5rem', border: '1.5px solid #99f6e4', borderRadius: '0.375rem', fontSize: '0.8125rem', textAlign: 'right', outline: 'none' }}
              />
              <button
                type="button"
                onClick={onApplyManualKm}
                disabled={calculatingFee}
                style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: 'none', background: calculatingFee ? '#94a3b8' : '#0d9488', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: calculatingFee ? 'not-allowed' : 'pointer' }}
              >
                Aplicar
              </button>
            </span>
          </div>
          {estimatedFee.is_approximate && (
            <div style={{ padding: '0.5rem 0.625rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#92400e' }}>
              ⚠ Distância estimada — confira no mapa ou informe a distância real acima para o frete exato.
            </div>
          )}
          {estimatedFee.duration_min > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tempo estimado</span>
              <span>{Math.round(estimatedFee.duration_min)} min</span>
            </div>
          )}
          {/* Multiplicador do veículo (§7.4 Fase 2) quando diferente do preço cheio */}
          {estimatedFee.fee_breakdown && estimatedFee.fee_breakdown.vehicle_multiplier != null && estimatedFee.fee_breakdown.vehicle_multiplier !== 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Multiplicador do veículo (×{Number(estimatedFee.fee_breakdown.vehicle_multiplier).toFixed(2).replace('.', ',')})</span>
              <span>aplicado na entrega</span>
            </div>
          )}
          {/* Linhas da tabela (§7.4): deslocamento e volta, quando cobrados */}
          {estimatedFee.fee_breakdown && (estimatedFee.fee_breakdown.pickup_fee > 0 || estimatedFee.fee_breakdown.round_trip_fee > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Entrega</span>
              <span>R$ {Number(estimatedFee.fee_breakdown.base_fee || 0).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          {estimatedFee.fee_breakdown && estimatedFee.fee_breakdown.pickup_fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Deslocamento até a coleta</span>
              <span>R$ {Number(estimatedFee.fee_breakdown.pickup_fee).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          {estimatedFee.fee_breakdown && estimatedFee.fee_breakdown.round_trip_fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Volta (ida + volta)</span>
              <span>R$ {Number(estimatedFee.fee_breakdown.round_trip_fee).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f766e', borderTop: '1px solid #99f6e4', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}>
            <span>Frete</span>
            <span>R$ {estimatedFee.delivery_fee?.toFixed(2).replace('.', ',')}</span>
          </div>
          <div style={{ fontSize: '0.625rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.25rem' }}>
            {estimatedFee.distance_source === 'manual'
              ? 'Distância informada por você'
              : estimatedFee.distance_source === 'osrm'
                ? 'Distância real (rota)'
                : 'Distância estimada (linha reta)'}
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
