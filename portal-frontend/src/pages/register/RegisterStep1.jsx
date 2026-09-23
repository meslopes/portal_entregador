import React from 'react';
import { ArrowRight } from 'lucide-react';

const RegisterStep1 = ({ formData, handleChange, checkEmail, emailStatus, nextStep }) => (
  <div className="auth-animate-in">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <label className="auth-form-label">Nome *</label>
        <input name="first_name" className="auth-form-input" placeholder="Seu nome"
          value={formData.first_name} onChange={handleChange} required />
      </div>
      <div>
        <label className="auth-form-label">Sobrenome *</label>
        <input name="last_name" className="auth-form-input" placeholder="Seu sobrenome"
          value={formData.last_name} onChange={handleChange} required />
      </div>
    </div>
    <div style={{ marginBottom: '1rem' }}>
      <label className="auth-form-label">Email *</label>
      <input type="email" name="email" className="auth-form-input" placeholder="seu@email.com"
        value={formData.email} onChange={handleChange}
        onBlur={() => checkEmail(formData.email)} required />
      {emailStatus === 'checking' && <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Verificando email...</p>}
      {emailStatus === 'taken' && <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>Este email já está cadastrado</p>}
      {emailStatus === 'available' && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>Email disponível</p>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <label className="auth-form-label">Telefone *</label>
        <input name="phone" className="auth-form-input" placeholder="(11) 99999-9999"
          value={formData.phone} onChange={handleChange} required />
      </div>
      <div>
        <label className="auth-form-label">CPF</label>
        <input name="cpf" className="auth-form-input" placeholder="000.000.000-00"
          value={formData.cpf} onChange={handleChange} />
      </div>
    </div>
    <button type="button" className="auth-btn-primary" onClick={nextStep} style={{ marginTop: '0.5rem' }}>
      Próximo <ArrowRight size={18} />
    </button>
  </div>
);

export default RegisterStep1;
