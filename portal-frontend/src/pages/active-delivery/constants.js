import { CheckCircle, Package, Navigation, MapPin } from 'lucide-react';

export const STATUS_FLOW = [
  { key: 'ACCEPTED', label: 'Aceito', icon: CheckCircle },
  { key: 'PREPARING', label: 'Preparando', icon: Package },
  { key: 'READY', label: 'Pronto', icon: CheckCircle },
  { key: 'PICKED_UP', label: 'Coletado', icon: Navigation },
  { key: 'DELIVERED', label: 'Entregue', icon: MapPin },
];

// Ações do entregador: só a partir de PREPARING (estabelecimento muda ACCEPTED→PREPARING→READY)
// Entregador pode coletar a partir de PREPARING ou READY
export const STATUS_ACTIONS = {
  PREPARING: { label: 'Coletar Pedido', next: 'PICKED_UP', color: '#2563eb' },
  READY: { label: 'Coletar Pedido', next: 'PICKED_UP', color: '#2563eb' },
  PICKED_UP: { label: 'Entregar Pedido', next: 'DELIVERED', color: '#22c55e' },
};

// Proteção contra XSS em popups do Leaflet
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};
