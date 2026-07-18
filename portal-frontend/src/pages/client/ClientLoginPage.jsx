import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShoppingBag, Clock, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ClientLoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login(formData.email, formData.password);
      const userType = response?.user?.user_type;
      if (userType === 'CLIENT') {
        navigate('/client', { replace: true });
      } else if (userType === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // erro tratado no contexto
    } finally {
      setIsLoading(false);
    }
  };

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
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.6 }}>
            Gerencie suas entregas<br />com eficiência
          </p>

          <div style={{ textAlign: 'left' }}>
            <div className="feature-item">
              <div className="feature-icon"><ShoppingBag size={20} /></div>
              <span>Lance pedidos com facilidade</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Clock size={20} /></div>
              <span>Acompanhe cada entrega</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><MapPin size={20} /></div>
              <span>Entregadores automáticos por proximidade</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Shield size={20} /></div>
              <span>Pagamento seguro e flexível</span>
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
                <label className="auth-form-label">Email</label>
                <input
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
                <label className="auth-form-label">Senha</label>
                <div className="password-wrapper">
                  <input
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
                <span style={{ fontSize: '0.8125rem', color: '#64748b', cursor: 'pointer' }}>
                  Esqueci minha senha
                </span>
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
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Não tem uma conta?{' '}
              <Link to="/client/register" className="auth-footer-link">
                Cadastre-se
              </Link>
            </p>
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#f1f5f9',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            <strong style={{ color: '#64748b' }}>Teste:</strong> cliente@teste.com / 123456
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientLoginPage;
