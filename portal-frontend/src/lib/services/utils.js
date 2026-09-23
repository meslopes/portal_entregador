// Utilitários
export const utils = {
  formatCurrency: (value) => {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  formatDate: (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  },

  formatDateTime: (date) => {
    if (!date) return '';
    const str = typeof date === 'string' && !date.endsWith('Z') ? date + 'Z' : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(str));
  },

  formatTime: (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },

  getStatusColor: (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-orange-100 text-orange-800',
      READY: 'bg-purple-100 text-purple-800',
      PICKED_UP: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  getStatusText: (status) => {
    const texts = {
      PENDING: 'Pendente',
      ACCEPTED: 'Aceito',
      PREPARING: 'Preparando',
      READY: 'Pronto',
      PICKED_UP: 'Coletado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      SUSPENDED: 'Suspenso',
      CAR: 'Carro',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      FOOT: 'A pé',
      CASH: 'Dinheiro',
      CARD: 'Cartão',
      PIX: 'PIX',
    };
    return texts[status] || status;
  },

  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
};
