import React, { useState, useEffect } from 'react';
import {
  Clock, MapPin, CheckCircle, XCircle, AlertCircle,
  Package, Store, Calendar, DollarSign, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { driverService, utils } from '@/lib/api';

const HistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await driverService.getDeliveryHistory(page);
      setOrders(response.orders || []);
      setTotalPages(response.pages || 1);
    } catch (err) {
      setError('Erro ao carregar histórico');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(search) ||
      order.restaurant?.name?.toLowerCase().includes(search) ||
      order.delivery_address?.street?.toLowerCase().includes(search)
    );
  });

  if (loading && orders.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Histórico de Entregas
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Veja todas as suas entregas anteriores
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Busca */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          position: 'relative',
          maxWidth: '400px'
        }}>
          <Search size={16} style={{
            position: 'absolute', left: '0.875rem', top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="Buscar por pedido, restaurante ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              borderRadius: '0.5rem',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: 'white'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {/* Lista */}
      {filteredOrders.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '5rem', height: '5rem',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Package size={32} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
            Nenhuma entrega no histórico
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Suas entregas realizadas aparecerão aqui
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredOrders.map((order) => (
            <HistoryCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: page === 1 ? '#f8fafc' : 'white',
              color: page === 1 ? '#cbd5e1' : '#475569',
              fontSize: '0.875rem',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: page === totalPages ? '#f8fafc' : 'white',
              color: page === totalPages ? '#cbd5e1' : '#475569',
              fontSize: '0.875rem',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const HistoryCard = ({ order }) => {
  const isDelivered = order.status === 'DELIVERED';
  const earnings = order.delivery?.driver_earnings;

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.15s'
    }}>
      <div style={{ padding: '1.25rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2.25rem', height: '2.25rem',
              borderRadius: '0.5rem',
              background: isDelivered ? '#dcfce7' : '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isDelivered ? (
                <CheckCircle size={16} style={{ color: '#22c55e' }} />
              ) : (
                <XCircle size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                Pedido #{order.order_number}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={11} />
                {utils.formatDateTime(order.created_at)}
              </p>
            </div>
          </div>
          {earnings && (
            <div style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '9999px',
              background: isDelivered ? '#dcfce7' : '#f1f5f9',
              color: isDelivered ? '#16a34a' : '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 700
            }}>
              +{utils.formatCurrency(earnings)}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={14} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.restaurant?.name || 'Restaurante'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.delivery_address?.street || 'Destino'}
              {order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.875rem',
          paddingTop: '0.875rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <DollarSign size={13} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Total: {utils.formatCurrency(order.total_amount)}
            </span>
          </div>
          <span style={{
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            background: isDelivered ? '#dcfce7' : '#fee2e2',
            color: isDelivered ? '#16a34a' : '#dc2626'
          }}>
            {isDelivered ? 'Entregue' : 'Cancelado'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
