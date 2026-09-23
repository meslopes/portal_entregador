import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { orderService } from '@/lib/api';
import OrderFilters from './client-orders/OrderFilters';
import ClientOrdersList from './client-orders/ClientOrdersList';
import ClientOrderDetail from './client-orders/ClientOrderDetail';

const ClientOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders(page, 15, filter);
      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError('Erro ao carregar pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const openDetails = async (orderId) => {
    try {
      const data = await orderService.getOrderDetails(orderId);
      setSelectedOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(s) ||
      o.customer?.name?.toLowerCase().includes(s) ||
      o.delivery_address?.street?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Meus Pedidos
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Histórico completo dos seus pedidos de entrega
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros e Busca */}
      <OrderFilters
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        setPage={setPage}
      />

      {/* Lista */}
      <ClientOrdersList
        loading={loading}
        filtered={filtered}
        search={search}
        filter={filter}
        openDetails={openDetails}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
      />

      {/* Modal de Detalhes */}
      {selectedOrder && (
        <ClientOrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={() => {
            setSelectedOrder(null);
            loadOrders();
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ClientOrdersPage;
