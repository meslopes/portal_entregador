import { Users, X } from 'lucide-react';

export default function AssignDriverModal({
  orderToAssign,
  onlineDrivers,
  assignLoading,
  onAssign,
  onClose,
}) {
  if (!orderToAssign) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label="Atribuir Entregador" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Atribuir Entregador</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pedido</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>#{orderToAssign.order_number}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {orderToAssign.restaurant?.name} → {orderToAssign.customer?.name}
          </p>
        </div>
        <div style={{ padding: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
          {onlineDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Nenhum entregador online</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {onlineDrivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => onAssign(driver.id)}
                  disabled={assignLoading}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                    background: 'white', cursor: assignLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    textAlign: 'left', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!assignLoading) e.currentTarget.style.borderColor = '#2563eb'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0
                  }}>
                    {driver.user?.first_name?.[0]}{driver.user?.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {driver.user?.first_name} {driver.user?.last_name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {driver.vehicle_type === 'MOTORCYCLE' ? '🏍️ Moto' : driver.vehicle_type === 'CAR' ? '🚗 Carro' : '🚲 Bike'}
                      {driver.current_order ? ' • Em entrega' : ' • Livre'}
                    </p>
                  </div>
                  <Users size={16} style={{ color: '#64748b' }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white', color: '#64748b',
              fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
