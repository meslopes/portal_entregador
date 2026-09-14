import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Bike, MapPin, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState(null);

  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
    setAccountOptions(null);
  };

  const handleAccountSelect = async (userType) => {
    setIsLoading(true);
    setAccountOptions(null);
    try {
      const response = await login(formData.email, formData.password, userType);
      const user = response?.user || JSON.parse(localStorage.getItem('user'));
      navigateToDashboard(user);
    } catch (err) {
      // erro tratado no contexto
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDashboard = (user) => {
    const userType = user?.user_type;
    const isSuperAdmin = user?.is_super_admin;
    let target;
    if (userType === 'ADMIN' && isSuperAdmin) {
      target = '/platform';
    } else if (userType === 'ADMIN') {
      target = '/admin';
    } else if (userType === 'CLIENT') {
      target = '/client';
    } else {
      target = '/dashboard';
    }
    navigate(target, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAccountOptions(null);
    try {
      const response = await login(formData.email, formData.password);
      const user = response?.user || JSON.parse(localStorage.getItem('user'));
      navigateToDashboard(user);
    } catch (err) {
      // Se 409 - múltiplas contas, mostrar seletor
      if (err?.response?.status === 409 && err?.response?.data?.options) {
        setAccountOptions(err.response.data.options);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Lado esquerdo - Branding */}
      <div className="auth-branding" style={{ flex: '0 0 45%' }}>
        <div className="auth-animate-in" style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
          <img
            src="/logo-muvy.jpg"
            alt="muv.log"
            style={{ height: '80px', marginBottom: '2rem', borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            muv.log
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.6 }}>
            Plataforma completa para gestão<br />de entregadores
          </p>

          <div style={{ textAlign: 'left' }}>
            <div className="feature-item">
              <div className="feature-icon"><Bike size={20} /></div>
              <span>Gestão completa de entregadores</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><MapPin size={20} /></div>
              <span>Tracking em tempo real</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><BarChart3 size={20} /></div>
              <span>Relatórios e analytics</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Shield size={20} /></div>
              <span>Pagamentos seguros e rápidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-animate-in">
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Bem-vindo de volta
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
              Faça login para acessar sua conta
            </p>
          </div>

          <div className="auth-form-card">
            {/* Seletor de conta quando há múltiplos usuários com mesmo email */}
            {accountOptions ? (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem', textAlign: 'center' }}>
                  Este email possui múltiplas contas. Escolha como deseja entrar:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {accountOptions.map((opt) => {
                    const icons = { ADMIN: Shield, DRIVER: Bike, CLIENT: MapPin };
                    const colors = { ADMIN: '#7c3aed', DRIVER: '#2563eb', CLIENT: '#0d9488' };
                    const Icon = icons[opt.user_type] || Shield;
                    const color = colors[opt.user_type] || '#64748b';
                    return (
                      <button
                        key={opt.user_type}
                        onClick={() => handleAccountSelect(opt.user_type)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '1rem', borderRadius: '0.75rem',
                          border: `2px solid ${color}20`, background: `${color}08`,
                          cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                          color: color, transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${color}15`}
                        onMouseLeave={(e) => e.currentTarget.style.background = `${color}08`}
                      >
                        <Icon size={22} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setAccountOptions(null)}
                  style={{
                    display: 'block', margin: '1rem auto 0', background: 'none',
                    border: 'none', color: '#64748b', fontSize: '0.8125rem',
                    cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 7.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z"/>
                  </svg>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="login-email" className="auth-form-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  className="auth-form-input"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" className="auth-form-label">Senha</label>
                <div className="password-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-form-input"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                <a href="/support" style={{ fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none' }}>
                  Esqueci minha senha
                </a>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div style={{
                      width: '1rem', height: '1rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Não tem uma conta?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link to="/register" className="auth-footer-link">
                Cadastre-se como entregador
              </Link>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <Link to="/client/register" className="auth-footer-link">
                Cadastre-se como estabelecimento
              </Link>
            </div>
          </div>

          {/* Credenciais de teste - sutil */}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
