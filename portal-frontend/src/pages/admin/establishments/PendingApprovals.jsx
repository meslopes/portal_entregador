import React from 'react';
import { AlertCircle } from 'lucide-react';

const PendingApprovals = ({ pendingEstablishments, onApprove, onReject }) => {
  if (!pendingEstablishments.length) return null;

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <AlertCircle size={16} style={{ color: '#d97706' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e' }}>
          {pendingEstablishments.length} estabelecimento(s) aguardando aprovação
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {pendingEstablishments.map(est => (
          <div key={est.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem', background: 'white', borderRadius: '0.5rem',
            border: '1px solid #fde68a', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{est.first_name} {est.last_name}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{est.email}</span>
              {est.phone && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{est.phone}</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => onApprove(est.id)} style={{
                padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none',
                background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
              }}>Aprovar</button>
              <button onClick={() => onReject(est.id)} style={{
                padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #ef4444',
                background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
              }}>Rejeitar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingApprovals;
