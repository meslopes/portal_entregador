import React from 'react';
import { Store, X, MapPin, Phone, Mail, Edit, Bike, Users } from 'lucide-react';
import { utils } from '@/lib/api';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import { Modal, btnSecondary, STATUS_CONFIG } from './ui';

const EstablishmentDetails = ({
  details, onClose, onEdit, onToggleOwnDrivers
}) => {
  const [routingState, setRoutingState] = React.useState(details.enable_platform_routing);

  const handleToggleRouting = async () => {
    try {
      await api.put(`/api/admin/establishments/${details.id}`, {
        enable_platform_routing: !routingState
      });
      setRoutingState(!routingState);
    } catch {
      showToast('Erro ao alterar configuração', 'error');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Detalhes do Estabelecimento</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={24} style={{ color: '#0d9488' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{details.name}</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={12} /> {details.address}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Pedidos</p>
            <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#2563eb' }}>{details.total_orders}</p>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Receita Total</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#22c55e' }}>{utils.formatCurrency(details.total_revenue)}</p>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: details.is_active ? '#16a34a' : '#64748b' }}>
              {details.is_active ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>

        {/* Tipo de Entregador */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tipo de Entregador
          </p>
          <div style={{
            padding: '1rem', borderRadius: '0.5rem',
            background: details.has_own_drivers ? '#eff6ff' : '#f0fdf4',
            border: `1px solid ${details.has_own_drivers ? '#93c5fd' : '#86efac'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                background: details.has_own_drivers ? '#2563eb' : '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {details.has_own_drivers
                  ? <Users size={16} style={{ color: 'white' }} />
                  : <Bike size={16} style={{ color: 'white' }} />
                }
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                  {details.has_own_drivers ? 'Entregadores Próprios' : 'Plataforma MUV'}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {details.has_own_drivers
                    ? 'Gerencia seus próprios entregadores'
                    : 'Usa entregadores da plataforma'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggleOwnDrivers(details)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                background: details.has_own_drivers ? '#16a34a' : '#2563eb',
                color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                whiteSpace: 'nowrap'
              }}
            >
              {details.has_own_drivers
                ? <><Bike size={14} /> Mudar p/ Plataforma</>
                : <><Users size={14} /> Mudar p/ Próprios</>
              }
            </button>
          </div>
        </div>

        {/* Roteirização para Plataforma */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Roteirização
          </p>
          <div style={{
            padding: '1rem', borderRadius: '0.5rem',
            background: routingState ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${routingState ? '#86efac' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                Roteirização Multi-Parada
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {routingState
                  ? 'Entregadores podem sair com múltiplos pedidos'
                  : 'Cada pedido é entregue individualmente'
                }
              </p>
            </div>
            <button
              onClick={handleToggleRouting}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                background: routingState ? '#16a34a' : '#94a3b8',
                color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600
              }}
            >
              {routingState ? 'Ativado' : 'Desativado'}
            </button>
          </div>
        </div>

        {/* Contato */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {details.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>{details.phone}</span>
              </div>
            )}
            {details.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>{details.email}</span>
              </div>
            )}
            {details.cnpj && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Store size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>CNPJ: {details.cnpj}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pedidos por status */}
        {details.orders_by_status && Object.keys(details.orders_by_status).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pedidos por Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(details.orders_by_status).map(([status, count]) => {
                const config = STATUS_CONFIG[status] || { color: '#64748b', bg: '#f1f5f9', text: status };
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: config.bg, color: config.color, fontSize: '0.75rem', fontWeight: 600 }}>
                    <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: config.color }} />
                    {config.text}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Últimos pedidos */}
        {details.recent_orders?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimos Pedidos</p>
            {details.recent_orders.slice(0, 8).map((order) => {
              const config = STATUS_CONFIG[order.status] || { color: '#64748b', bg: '#f1f5f9', text: order.status };
              return (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{utils.formatDate(order.created_at)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.125rem 0.375rem', borderRadius: '9999px', background: config.bg, color: config.color }}>
                      {config.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { onClose(); onEdit(details); }}
          style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Edit size={14} /> Editar
        </button>
      </div>
    </Modal>
  );
};

export default EstablishmentDetails;
