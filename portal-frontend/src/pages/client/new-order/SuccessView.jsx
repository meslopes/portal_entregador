import React from 'react';
import { CheckCircle } from 'lucide-react';
import DistributionModal from '@/components/DistributionModal';

const SuccessView = ({ showDistribution, createdOrder, onCloseDistribution, onDistributed }) => (
  <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
        <CheckCircle size={40} style={{ color: '#22c55e' }} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>Pedido Enviado!</h2>
      <p style={{ color: '#16a34a' }}>O pedido foi registrado com sucesso.</p>
    </div>
    {showDistribution && createdOrder && (
      <DistributionModal
        order={createdOrder}
        onClose={onCloseDistribution}
        onDistributed={onDistributed}
      />
    )}
  </div>
);

export default SuccessView;
