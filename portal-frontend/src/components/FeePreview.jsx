import React from 'react';
import { calcularFretePreview } from '@/lib/feePreview';

/**
 * Prévia do frete que o cliente verá (2, 5 e 10 km) — usada por
 * "Meus Preços" e "Tabelas de Preço" (admin). Mesma regra do sistema.
 */
const FeePreview = ({ form }) => (
  <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0d9488', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
      Prévia do frete que o cliente verá
    </p>
    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
      {[2, 5, 10].map(km => (
        <div key={km}>
          <p style={{ color: '#64748b', margin: 0 }}>{km} km</p>
          <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>R$ {calcularFretePreview(form, km).toFixed(2).replace('.', ',')}</p>
        </div>
      ))}
    </div>
    {form.pickup_rate_per_km && parseFloat(form.pickup_rate_per_km) > 0 && (
      <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.5rem 0 0' }}>
        + taxa de deslocamento (varia conforme a posição do motorista no momento do pedido)
      </p>
    )}
    {form.round_trip && form.round_trip_rate_per_km && parseFloat(form.round_trip_rate_per_km) > 0 && (
      <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.5rem 0 0' }}>
        + volta (ida + volta) quando a opção estiver ligada
      </p>
    )}
    {form.free_delivery_min_order && (
      <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.5rem 0 0' }}>
        ✓ Frete grátis para pedidos com produtos acima de R$ {parseFloat(form.free_delivery_min_order).toFixed(2)}
      </p>
    )}
  </div>
);

export default FeePreview;
