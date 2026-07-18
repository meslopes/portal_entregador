import React, { useState, useEffect } from 'react';
import {
  Store, Search, AlertCircle, Phone, Mail,
  ChevronLeft, ChevronRight, Package, MapPin
} from 'lucide-react';

const AdminEstablishmentsPage = () => {
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      // Busca todos os usuários CLIENT
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/drivers?page=1&per_page=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Como não tem endpoint específico, vamos usar uma abordagem diferente
      // Vamos buscar todos os pedidos e extrair os estabelecimentos únicos
      const ordersResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/orders?page=1&per_page=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];

        // Extrai estabelecimentos únicos dos pedidos
        const establishmentMap = new Map();
        orders.forEach(order => {
          if (order.restaurant) {
            const key = order.restaurant.id || order.restaurant.name;
            if (!establishmentMap.has(key)) {
              establishmentMap.set(key, {
                ...order.restaurant,
                orderCount: 0,
                totalRevenue: 0
              });
            }
            const est = establishmentMap.get(key);
            est.orderCount++;
            est.totalRevenue += order.total_amount || 0;
          }
        });

        setEstablishments(Array.from(establishmentMap.values()));
      }
    } catch (err) {
      setError('Erro ao carregar estabelecimentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = establishments.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Estabelecimentos</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie os estabelecimentos cadastrados</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="Buscar estabelecimento..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none' }} />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Store size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Nenhum estabelecimento encontrado</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Estabelecimentos que fizerem pedidos aparecerão aqui</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map((est, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={18} style={{ color: '#0d9488' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>{est.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={11} /> {est.address || 'Endereço não informado'}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{est.orderCount || 0}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Pedidos</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>R$ {(est.totalRevenue || 0).toFixed(2).replace('.', ',')}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Receita</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminEstablishmentsPage;
