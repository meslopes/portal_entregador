import React from 'react';
import { Check } from 'lucide-react';

const features = [
  'Cadastro completo em minutos',
  'Gerencie suas entregas',
  'Acompanhe em tempo real',
];

const BrandingSide = () => (
  <div className="auth-branding" style={{ flex: '0 0 45%', background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }}>
    <div className="auth-animate-in" style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
      <img
        src="/logo-muvlog.jpg"
        alt="muv.log"
        style={{ height: '80px', marginBottom: '2rem', borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
      />
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
        muv.log
      </h1>
      <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '2.5rem', lineHeight: 1.6 }}>
        Cadastre seu estabelecimento
      </p>
      <div style={{ textAlign: 'left' }}>
        {features.map((text) => (
          <div key={text} className="feature-item">
            <div className="feature-icon"><Check size={20} /></div>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default BrandingSide;
