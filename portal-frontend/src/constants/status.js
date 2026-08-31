// Status de Pedidos
export const ORDER_STATUS = {
  SCHEDULED: { key: 'SCHEDULED', label: 'Agendado', color: '#6366f1', bg: '#e0e7ff', icon: '⏰' },
  PENDING: { key: 'PENDING', label: 'Pendente', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  ACCEPTED: { key: 'ACCEPTED', label: 'Aceito', color: '#2563eb', bg: '#dbeafe', icon: '✅' },
  PREPARING: { key: 'PREPARING', label: 'Preparando', color: '#8b5cf6', bg: '#f3e8ff', icon: '👨‍🍳' },
  READY: { key: 'READY', label: 'Pronto', color: '#06b6d4', bg: '#cffafe', icon: '📦' },
  PICKED_UP: { key: 'PICKED_UP', label: 'A Caminho', color: '#3b82f6', bg: '#dbeafe', icon: '🚚' },
  DELIVERED: { key: 'DELIVERED', label: 'Entregue', color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  CANCELLED: { key: 'CANCELLED', label: 'Cancelado', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

// Status de Rotas
export const ROUTE_STATUS = {
  CREATED: { key: 'CREATED', label: 'Sem Entregador', color: '#64748b', bg: '#f1f5f9' },
  PENDING: { key: 'PENDING', label: 'Aguardando Aceite', color: '#f59e0b', bg: '#fef3c7' },
  ACTIVE: { key: 'ACTIVE', label: 'Em Rota', color: '#2563eb', bg: '#dbeafe' },
  COMPLETED: { key: 'COMPLETED', label: 'Concluída', color: '#22c55e', bg: '#dcfce7' },
  REJECTED: { key: 'REJECTED', label: 'Rejeitada', color: '#ef4444', bg: '#fee2e2' },
  CANCELLED: { key: 'CANCELLED', label: 'Cancelada', color: '#ef4444', bg: '#fee2e2' },
};

// Métodos de Pagamento
export const PAYMENT_METHOD = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'PIX',
};

// Helper para obter label do status
export const getStatusLabel = (status) => ORDER_STATUS[status]?.label || status;
export const getRouteStatusLabel = (status) => ROUTE_STATUS[status]?.label || status;
export const getPaymentLabel = (method) => PAYMENT_METHOD[method] || method;
