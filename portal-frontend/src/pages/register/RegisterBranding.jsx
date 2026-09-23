import React from 'react';
import { Check } from 'lucide-react';

const RegisterBranding = () => (
  <div className="auth-branding" style={{ flex: '0 0 45%' }}>
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
        Junte-se à nossa equipe de entregadores
      </p>

      <div style={{ textAlign: 'left' }}>
        <div className="feature-item">
          <div className="feature-icon"><Check size={20} /></div>
          <span>Cadastro rápido e simples</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon"><Check size={20} /></div>
          <span>Comece a ganhar imediatamente</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon"><Check size={20} /></div>
          <span>Pagamentos semanalmente</span>
        </div>
        <div className="feature-item">
          <div className="feature-icon"><Check size={20} /></div>
          <span>Suporte dedicado 24h</span>
        </div>
      </div>
    </div>
  </div>
);

export default RegisterBranding;
