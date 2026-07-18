import React, { useState, useEffect } from 'react';
import {
  Users, Search, AlertCircle, Truck, Phone, Mail,
  Star, ChevronLeft, ChevronRight, Bike, Car, Footprints
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadDrivers(); }, [page, statusFilter]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDrivers(page, 20, search, statusFilter);
      setDrivers(response.drivers || []);
      setTotalPages(response.pages || 1);
    } catch (err) {
      setError('Erro ao carregar entregadores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); loadDrivers(); };

  if (loading && drivers.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Entregadores</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie todos os entregadores do sistema</p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
                fontSize: '0.875rem', outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'online', label: 'Online' },
              { key: 'offline', label: 'Offline' },
            ].map(f => (
              <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(1); }}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.5rem',
                  border: '1px solid', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                  borderColor: statusFilter === f.key ? '#2563eb' : '#e2e8f0',
                  background: statusFilter === f.key ? '#2563eb' : 'white',
                  color: statusFilter === f.key ? 'white' : '#475569',
                  transition: 'all 0.15s'
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      {drivers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Users size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Nenhum entregador encontrado</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {drivers.map(driver => <DriverCard key={driver.id} driver={driver} />)}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : 'white', color: page === 1 ? '#cbd5e1' : '#475569', fontSize: '0.875rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : 'white', color: page === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.875rem', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const VEHICLE_ICONS = {
  MOTORCYCLE: { icon: Bike, label: 'Moto', color: '#2563eb' },
  CAR: { icon: Car, label: 'Carro', color: '#8b5cf6' },
  BICYCLE: { icon: Bike, label: 'Bicicleta', color: '#16a34a' },
  FOOT: { icon: Footprints, label: 'A pé', color: '#d97706' },
};

const DriverCard = ({ driver }) => {
  const vehicle = VEHICLE_ICONS[driver.vehicle_type] || VEHICLE_ICONS.MOTORCYCLE;
  const VehicleIcon = vehicle.icon;
  const initials = `${driver.user?.first_name?.[0] || ''}${driver.user?.last_name?.[0] || ''}`;

  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.15s', overflow: 'hidden'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
      {/* Header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            background: driver.is_online ? '#dcfce7' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700,
            color: driver.is_online ? '#16a34a' : '#94a3b8',
            position: 'relative'
          }}>
            {initials}
            <div style={{
              position: 'absolute', bottom: '0', right: '0',
              width: '0.75rem', height: '0.75rem', borderRadius: '50%',
              background: driver.is_online ? '#22c55e' : '#cbd5e1',
              border: '2px solid white'
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
              {driver.user?.first_name} {driver.user?.last_name}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Mail size={11} /> {driver.user?.email}
            </p>
            {driver.user?.phone && (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Phone size={11} /> {driver.user?.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
            background: driver.is_online ? '#dcfce7' : '#f1f5f9',
            color: driver.is_online ? '#16a34a' : '#94a3b8'
          }}>
            {driver.is_online ? 'Online' : 'Offline'}
          </span>
          <span style={{
            padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
            background: '#f8fafc', color: '#475569',
            display: 'flex', alignItems: 'center', gap: '0.25rem'
          }}>
            <VehicleIcon size={10} /> {vehicle.label}
          </span>
          {driver.vehicle_plate && (
            <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#f8fafc', color: '#475569' }}>
              {driver.vehicle_plate}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Star size={14} style={{ color: '#f59e0b' }} /> {driver.rating?.toFixed(1) || '5.0'}
            </p>
            <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Avaliação</p>
          </div>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{driver.total_deliveries || 0}</p>
            <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Entregas</p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#22c55e' }}>{utils.formatCurrency(driver.total_earnings || 0)}</p>
            <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Ganhos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDriversPage;
