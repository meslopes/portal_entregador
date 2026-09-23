import React from 'react';
import RouteStopCard from './RouteStopCard';
import { STATUS_MAP } from './constants';

const RouteStopsList = ({
  activeOrders,
  selectedOrder,
  updatingOrder,
  onSelectOrder,
  onNavigateGoogleMaps,
  onNavigateToDelivery,
  onAdvanceStatus,
}) => {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
          Pedidos da Rota
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
        {activeOrders.map((order, index) => {
          const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.ACCEPTED;

          return (
            <RouteStopCard
              key={order.id}
              order={order}
              index={index}
              isSelected={selectedOrder?.id === order.id}
              isUpdating={updatingOrder === order.id}
              statusInfo={statusInfo}
              onSelect={() => onSelectOrder(order)}
              onNavigateRestaurant={() =>
                onNavigateGoogleMaps(order.restaurant?.latitude, order.restaurant?.longitude)
              }
              onNavigateDelivery={() =>
                onNavigateGoogleMaps(order.delivery_address?.latitude, order.delivery_address?.longitude)
              }
              onViewDetails={() => onNavigateToDelivery(order.id)}
              onAdvanceStatus={() => onAdvanceStatus(order)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RouteStopsList;
