import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingPage = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default LoadingPage;
