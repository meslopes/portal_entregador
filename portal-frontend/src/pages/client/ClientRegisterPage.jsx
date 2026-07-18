import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, ShoppingBag, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ClientRegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
    setLocalError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.phone) {
        setLocalError('Preencha todos os campos obrigatórios');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.email) {
        setLocalError('Email é obrigatório');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('As senhas não coincidem');
        return false;
      }
      if (formData.password.length < 6) {
        setLocalError('A senha deve ter pelo menos 6 caracteres');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(s => s + 1);
      setLocalError('');
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsLoading(true);
    try {
      // Registra via API do cliente
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/auth/register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLocalError(data.error || 'Erro ao criar conta');
        return;
      }

      // Salva no localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/client', { replace: true });
    } catch (err) {
      setLocalError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const currentError = localError || error;

  return (
    <div className="auth-split-layout">
      {/* Lado esquerdo - Branding */}
      <div className="auth-branding" style={{ flex: '0 0 45%', background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }}>
        <div className="auth-animate-in" style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
          <img
            src="/logo-muvy.jpg"
            alt="muv.log"
            style={{ height: '80px', marginBottom: '2rem', borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            muv.log
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Crie sua conta e comece a pedir
          </p>

          <div style={{ textAlign: 'left' }}>
            <div className="feature-item">
              <div className="feature-icon"><Check size={20} /></div>
              <span>Cadastro rápido e simples</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Check size={20} /></div>
              <span>Acompanhe suas entregas</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Check size={20} /></div>
              <span>Pague como preferir</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-animate-in">
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Criar Conta
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
              Preencha seus dados para se cadastrar
            </p>
          </div>

          {/* Indicador de progresso */}
          <div className="step-indicator">
            {[
              { num: 1, label: 'Dados Pessoais' },
              { num: 2, label: 'Acesso' },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div style={{ textAlign: 'center' }}>
                  <div className={`step-dot ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: step === s.num ? '2.5rem' : '2rem', height: '2rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: step >= s.num ? 'white' : '#94a3b8' }}>
                    {step > s.num ? <Check size={14} /> : s.num}
                  </div>
                  <span className="step-label" style={{ fontSize: '0.6875rem', marginTop: '0.375rem', display: 'block', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < 1 && (
                  <div style={{
                    width: '2rem', height: '2px', background: step > s.num ? '#22c55e' : '#e2e8f0',
                    marginBottom: '1.25rem', transition: 'background 0.3s'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="auth-form-card">
            {currentError && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 7.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z"/>
                </svg>
                {currentError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Etapa 1 - Dados Pessoais */}
              {step === 1 && (
                <div className="auth-animate-in">
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="auth-form-label">Nome *</label>
                    <input name="first_name" className="auth-form-input" placeholder="Seu nome"
                      value={formData.first_name} onChange={handleChange} required />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="auth-form-label">Sobrenome *</label>
                    <input name="last_name" className="auth-form-input" placeholder="Seu sobrenome"
                      value={formData.last_name} onChange={handleChange} required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="auth-form-label">Telefone *</label>
                    <input name="phone" className="auth-form-input" placeholder="(11) 99999-9999"
                      value={formData.phone} onChange={handleChange} required />
                  </div>
                  <button type="button" className="auth-btn-primary" onClick={nextStep}>
                    Próximo <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* Etapa 2 - Acesso */}
              {step === 2 && (
                <div className="auth-animate-in">
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="auth-form-label">Email *</label>
                    <input type="email" name="email" className="auth-form-input" placeholder="seu@email.com"
                      value={formData.email} onChange={handleChange} required />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="auth-form-label">Senha *</label>
                    <div className="password-wrapper">
                      <input type={showPassword ? 'text' : 'password'} name="password" className="auth-form-input"
                        placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleChange}
                        required style={{ paddingRight: '2.75rem' }} />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label className="auth-form-label">Confirmar Senha *</label>
                    <div className="password-wrapper">
                      <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" className="auth-form-input"
                        placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={handleChange}
                        required style={{ paddingRight: '2.75rem' }} />
                      <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="auth-btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <button type="submit" className="auth-btn-primary" disabled={isLoading} style={{ flex: 2 }}>
                      {isLoading ? (
                        <>
                          <div style={{
                            width: '1rem', height: '1rem',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                          }} />
                          Criando conta...
                        </>
                      ) : (
                        <>Criar Conta <Check size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Já tem uma conta?{' '}
              <Link to="/client/login" className="auth-footer-link">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientRegisterPage;
