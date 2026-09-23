import React from 'react';
import { X, Bike } from 'lucide-react';
import { utils } from '@/lib/api';
import { InfoBox } from './shared';

const DriverDetailsModal = ({ driver, onClose }) => {
  if (!driver) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Detalhes do Entregador</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={24} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{driver.user?.first_name} {driver.user?.last_name}</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{driver.user?.email}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <InfoBox label="Veículo" value={utils.getStatusText(driver.vehicle_type)} />
            <InfoBox label="Placa" value={driver.vehicle_plate || '-'} />
            <InfoBox label="Avaliação" value={driver.statistics?.average_rating ? `${driver.statistics.average_rating} ⭐` : '-'} />
            <InfoBox label="Entregas" value={driver.total_deliveries || 0} />
            <InfoBox label="Ganhos Totais" value={utils.formatCurrency(driver.statistics?.total_earnings || 0)} />
            <InfoBox label="Status" value={driver.is_online ? 'Online' : 'Offline'} color={driver.is_online ? '#16a34a' : '#64748b'} />
          </div>
          {driver.pix_key && (
            <div style={{ padding: '0.75rem', background: '#f0fdfa', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>PIX</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{driver.pix_key}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDetailsModal;
