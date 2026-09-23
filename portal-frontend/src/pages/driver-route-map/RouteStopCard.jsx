import React from 'react';
import { MapPin, Navigation, Store, ExternalLink, CheckCircle } from 'lucide-react';

const RouteStopCard = ({
  order,
  index,
  isSelected,
  isUpdating,
  statusInfo,
  onSelect,
  onNavigateRestaurant,
  onNavigateDelivery,
  onViewDetails,
  onAdvanceStatus,
}) => {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginBottom: '0.5rem',
        background: isSelected ? '#eff6ff' : '#f8fafc',
        border: `1px solid ${isSelected ? '#bfdbfe' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            background: statusInfo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: 700,
            color: 'white',
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.75rem' }}>
            #{order.order_number}
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
          <Store size={10} style={{ color: '#f59e0b' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.restaurant?.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={10} style={{ color: '#22c55e' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.customer?.name}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigateRestaurant();
          }}
          style={{
            flex: 1,
            padding: '0.375rem',
            borderRadius: '0.25rem',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#f59e0b',
            fontSize: '0.625rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
          }}
        >
          <Navigation size={9} /> Mapa
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigateDelivery();
          }}
          style={{
            flex: 1,
            padding: '0.375rem',
            borderRadius: '0.25rem',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#22c55e',
            fontSize: '0.625rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
          }}
        >
          <Navigation size={9} /> Mapa
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          style={{
            padding: '0.375rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#2563eb',
            fontSize: '0.625rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ExternalLink size={9} />
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdvanceStatus();
        }}
        disabled={isUpdating}
        style={{
          width: '100%',
          marginTop: '0.5rem',
          padding: '0.5rem',
          borderRadius: '0.375rem',
          border: 'none',
          background: isUpdating ? '#64748b' : statusInfo.color,
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: isUpdating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
        }}
      >
        {isUpdating ? (
          'Atualizando...'
        ) : (
          <>
            <CheckCircle size={12} />
            {statusInfo.actionLabel}
          </>
        )}
      </button>
    </div>
  );
};

export default RouteStopCard;
