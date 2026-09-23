export const STATUS_MAP = {
  ACCEPTED: { next: 'PREPARING', actionLabel: 'Coletar', color: '#f59e0b' },
  PREPARING: { next: 'READY', actionLabel: 'Coletar', color: '#8b5cf6' },
  READY: { next: 'PICKED_UP', actionLabel: 'Coletar', color: '#06b6d4' },
  PICKED_UP: { next: 'DELIVERED', actionLabel: 'Entregar', color: '#22c55e' },
};

export const STATUS_TEXT = {
  ACCEPTED: 'A coletar',
  PREPARING: 'Preparando',
  READY: 'Pronto para coleta',
  PICKED_UP: 'A entregar',
};
