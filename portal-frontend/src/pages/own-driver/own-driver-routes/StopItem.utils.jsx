import React from 'react';
import { MapPin, Package, CheckCircle } from 'lucide-react';

export const getStopIcon = (stop) => {
  if (stop.status === 'COMPLETED') return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
  if (stop.stop_type === 'PICKUP') return <Package size={16} style={{ color: '#2563eb' }} />;
  return <MapPin size={16} style={{ color: '#f59e0b' }} />;
};

export const getStopLabel = (stop) => {
  if (stop.stop_type === 'PICKUP') return 'Coleta';
  return 'Entrega';
};
