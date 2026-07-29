import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Clock, Truck, CheckCircle, XCircle,
  MapPin, User, Phone, Store, DollarSign, RefreshCw, AlertCircle
} from 'lucide-react';
import { adminService, orderService, utils } from '@/lib/api';

const STATUS_CONFIG = {
  SCHEDULED: { color: '#6366f1', bg: '#e0e7ff', text: 'Agendado', icon: '⏰' },
  PENDING: { color: '#ef4444', bg: '#fee2e2', text: 'Tocando', icon: '🔔' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: '✅' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: '👨‍🍳' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: '📦' },
  PICKED_UP: { color: '#f59e0b', bg: '#fef3c7', text: 'Coletado', icon: '🏍️' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: '✅' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado', icon: '❌' },
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await orderService.getOrderDetails(orderId);
      setOrder(response.order || response);
      setError('');
    } catch (err) {
      setError('Erro ao carregar pedido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      loadOrder();
    } catch (err) {
      alert('Erro ao alterar status: ' + (err.response?.data?.error || err.message));
    }
  };

  const parseSpecialInstructions = (si) => {
    if (!si) return {};
    const info = {};
    
    // Parse JSON se existir
    try {
      const parsed = JSON.parse(si);
      Object.assign(info, parsed);
    } catch {
      // Não é JSON, parse como tags
    }
    
    // Parse rejection history
    const rejections = [];
    const reReject = /REJECTED_BY_(\d+)/g;
    let match;
    while ((match = reReject.exec(si)) !== null) {
      rejections.push(parseInt(match[1]));
    }
    info.rejections = rejections;
    
    // Parse current offer
    const offerMatch = si.match(/OFFERED_TO_(\d+)/);
    info.current_offer = offerMatch ? parseInt(offerMatch[1]) : null;
    
    return info;
  };

  const getTimeline = () => {
    if (!order) return [];
    
    const timeline = [];
    const si = parseSpecialInstructions(order.special_instructions);
    
    // Pedido criado
    timeline.push({
      status: 'CREATED',
      time: order.created_at,
      label: 'Pedido criado',
      detail: `Pedido #${order.order_number}`,
      icon: '📝',
      color: '#64748b'
    });
    
    // Agendado
    if (order.scheduled_at) {
      timeline.push({
        status: 'SCHEDULED',
        time: order.scheduled_at,
        label: 'Agendado para',
        detail: `Lançamento programado`,
        icon: '⏰',
        color: '#6366f1'
      });
    }
    
    // Status atual
    const statusConfig = STATUS_CONFIG[order.status];
    if (statusConfig) {
      timeline.push({
        status: order.status,
        time: order.updated_at,
        label: statusConfig.text,
        detail: getStatusDetail(order, si),
        icon: statusConfig.icon,
        color: statusConfig.color,
        current: true
      });
    }
    
    // Rejeições
    if (si.rejections && si.rejections.length > 0) {
      si.rejections.forEach((driverId, idx) => {
        timeline.push({
          status: 'REJECTED',
          time: null,
          label: `Entregador #${driverId} recusou`,
          detail: `Pedido repassado para próximo entregador`,
          icon: '❌',
          color: '#ef4444'
        });
      });
    }
    
    // Oferta atual
    if (si.current_offer && order.status === 'PENDING') {
      timeline.push({
        status: 'OFFERED',
        time: null,
        label: `Oferecido ao entregador #${si.current_offer}`,
        detail: 'Aguardando aceite',
        icon: '📱',
        color: '#f59e0b'
      });
    }
    
    return timeline;
  };

  const getStatusDetail = (order, si) => {
    switch (order.status) {
      case 'SCHEDULED':
        return `Será lançado automaticamente`;
      case 'PENDING':
        if (si.current_offer) {
          return `Oferecido ao entregador #${si.current_offer}`;
        }
        return 'Aguardando entregador aceitar';
      case 'ACCEPTED':
        return `Aceito por ${order.driver?.user?.first_name || 'entregador'}`;
      case 'PICKED_UP':
        return 'Em rota de entrega';
      case 'DELIVERED':
        return 'Entrega concluída';
      case 'CANCELLED':
        return 'Pedido cancelado';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <p style={{ color: '#64748b' }}>{error || 'Pedido não encontrado'}</p>
        <button onClick={() => navigate('/admin/orders')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>
          Voltar para Pedidos
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || {};
  const si = parseSpecialInstructions(order.special_instructions);
  const timeline = getTimeline();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/admin/orders')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Pedido #{order.order_number}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Criado em {new Date(order.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={loadOrder} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Status atual */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${statusConfig.color || '#64748b'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>{statusConfig.icon}</span>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: statusConfig.color }}>{statusConfig.text}</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{getStatusDetail(order, si)}</p>
          </div>
        </div>
        
        {/* Ações rápidas */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {order.status === 'SCHEDULED' && (
            <button onClick={() => handleChangeStatus('PENDING')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
              🔔 Tocar Agora
            </button>
          )}
          {order.status === 'PENDING' && (
            <button onClick={() => handleChangeStatus('CANCELLED')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8125rem' }}>
              Cancelar Pedido
            </button>
          )}
          {order.status === 'ACCEPTED' && (
            <button onClick={() => handleChangeStatus('PICKED_UP')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
              🏍️ Marcar Coletado
            </button>
          )}
          {order.status === 'PICKED_UP' && (
            <button onClick={() => handleChangeStatus('DELIVERED')} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
              ✅ Marcar Entregue
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Acompanhamento</h3>
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {/* Linha vertical */}
          <div style={{ position: 'absolute', left: '0.75rem', top: 0, bottom: 0, width: '2px', background: '#e2e8f0' }} />
          
          {timeline.map((item, idx) => (
            <div key={idx} style={{ position: 'relative', marginBottom: '1.25rem', paddingBottom: idx < timeline.length - 1 ? '0.25rem' : 0 }}>
              {/* Ponto na linha */}
              <div style={{
                position: 'absolute', left: '-1.5rem', top: '0.25rem',
                width: '12px', height: '12px', borderRadius: '50%',
                background: item.current ? item.color : '#e2e8f0',
                border: item.current ? `2px solid ${item.color}` : '2px solid #cbd5e1',
                zIndex: 1
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span style={{ fontWeight: 600, color: item.current ? item.color : '#1e293b', fontSize: '0.875rem' }}>{item.label}</span>
                    {item.current && (
                      <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', background: statusConfig.bg, color: statusConfig.color, fontSize: '0.625rem', fontWeight: 600 }}>
                        ATUAL
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.detail}</p>
                </div>
                {item.time && (
                  <span style={{ color: '#94a3b8', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                    {new Date(item.time).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes do pedido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Cliente */}
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> Cliente
          </h3>
          <p style={{ fontWeight: 500, color: '#1e293b' }}>{order.customer?.name || 'N/A'}</p>
          <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.customer?.phone || 'N/A'}</p>
        </div>

        {/* Estabelecimento */}
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={16} /> Estabelecimento
          </h3>
          <p style={{ fontWeight: 500, color: '#1e293b' }}>{order.restaurant?.name || 'N/A'}</p>
          <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.restaurant?.address || 'N/A'}</p>
        </div>
      </div>

      {/* Endereço de entrega */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} /> Endereço de Entrega
        </h3>
        <p style={{ fontWeight: 500, color: '#1e293b' }}>
          {order.delivery_address?.street}, {order.delivery_address?.neighborhood}
        </p>
        <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
          {order.delivery_address?.city}/{order.delivery_address?.state}
        </p>
      </div>

      {/* Valores */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={16} /> Valores
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Frete</p>
            <p style={{ fontWeight: 600, color: '#1e293b' }}>R$ {parseFloat(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</p>
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Total</p>
            <p style={{ fontWeight: 600, color: '#1e293b' }}>R$ {parseFloat(order.total_amount || 0).toFixed(2).replace('.', ',')}</p>
          </div>
          {si.product_value && (
            <div>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Valor dos Itens (cobrar do cliente)</p>
              <p style={{ fontWeight: 600, color: '#f59e0b' }}>R$ {parseFloat(si.product_value).toFixed(2).replace('.', ',')}</p>
            </div>
          )}
          <div>
            <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Pagamento</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{utils.getStatusText(order.payment_method)}</p>
          </div>
        </div>
      </div>

      {/* Entregador */}
      {order.driver && (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={16} /> Entregador
          </h3>
          <p style={{ fontWeight: 500, color: '#1e293b' }}>
            {order.driver.user?.first_name} {order.driver.user?.last_name}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.driver.vehicle_type}</p>
        </div>
      )}

      {/* Informações extras */}
      {si.distance_km && (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>Informações da Entrega</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Distância</p>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>{si.distance_km} km</p>
            </div>
            {si.price_per_km && (
              <div>
                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Preço por km</p>
                <p style={{ fontWeight: 500, color: '#1e293b' }}>R$ {parseFloat(si.price_per_km).toFixed(2).replace('.', ',')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OrderDetailPage;
