import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ClientRegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Dados do estabelecimento
    name: '', cnpj: '', phone: '', email: '',
    // Acesso
    password: '', confirmPassword: '',
    // Endereço
    address_street: '', address_number: '', address_neighborhood: '',
    address_city: 'Capão da Canoa', address_state: 'RS', address_zip: '',
    // Configurações
    preparation_minutes: '10',
    pickup_confirmation_type: 'code',
    delivery_confirmation_type: 'code',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const { error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
    setLocalError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.phone) {
        setLocalError('Nome do estabelecimento e telefone são obrigatórios');
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
    if (step === 3) {
      if (!formData.address_street || !formData.address_number || !formData.address_neighborhood) {
        setLocalError('Preencha rua, número e bairro');
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/auth/register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.name,
          last_name: '',
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          cnpj: formData.cnpj || null,
          establishment_name: formData.name,
          address: `${formData.address_street}, ${formData.address_number} - ${formData.address_neighborhood}, ${formData.address_city} - ${formData.address_state}, ${formData.address_zip}`,
          preparation_minutes: parseInt(formData.preparation_minutes) || 10,
          pickup_confirmation_type: formData.pickup_confirmation_type,
          delivery_confirmation_type: formData.delivery_confirmation_type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLocalError(data.error || 'Erro ao criar conta');
        return;
      }

      navigate('/pending-approval');
    } catch (err) {
      setLocalError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const currentError = localError || error;

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem'
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
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Cadastre seu estabelecimento
          </p>
          <div style={{ textAlign: 'left' }}>
            <div className="feature-item"><div className="feature-icon"><Check size={20} /></div><span>Cadastro completo em minutos</span></div>
            <div className="feature-item"><div className="feature-icon"><Check size={20} /></div><span>Gerencie suas entregas</span></div>
            <div className="feature-item"><div className="feature-icon"><Check size={20} /></div><span>Acompanhe em tempo real</span></div>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-animate-in">
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Cadastro de Estabelecimento
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
              Preencha os dados do seu estabelecimento
            </p>
          </div>

          {/* Indicador de progresso */}
          <div className="step-indicator">
            {[
              { num: 1, label: 'Estabelecimento' },
              { num: 2, label: 'Acesso' },
              { num: 3, label: 'Endereço' },
              { num: 4, label: 'Configurações' },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div style={{ textAlign: 'center' }}>
                  <div className={`step-dot ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: step === s.num ? '2.5rem' : '2rem', height: '2rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: step >= s.num ? 'white' : '#64748b' }}>
                    {step > s.num ? <Check size={14} /> : s.num}
                  </div>
                  <span className="step-label" style={{ fontSize: '0.6875rem', marginTop: '0.375rem', display: 'block', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div style={{ width: '2rem', height: '2px', background: step > s.num ? '#22c55e' : '#e2e8f0', marginBottom: '1.25rem', transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="auth-form-card">
            <div style={{ minHeight: currentError ? 'auto' : '0' }}>
              {currentError && (
                <div className="auth-error">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.5 3h1v5h-1V4zm.5 7.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z"/>
                  </svg>
                  {currentError}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Etapa 1 - Dados do Estabelecimento */}
              {step === 1 && (
                <div className="auth-animate-in" key="step1">
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Nome do Estabelecimento *</label>
                    <input name="name" style={inputStyle} placeholder="Ex: Farmácia da Esquina"
                      value={formData.name} onChange={handleChange} required />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>CNPJ</label>
                    <input name="cnpj" style={inputStyle} placeholder="00.000.000/0001-00"
                      value={formData.cnpj} onChange={handleChange} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Telefone *</label>
                    <input name="phone" style={inputStyle} placeholder="(51) 99999-9999"
                      value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" name="email" style={inputStyle} placeholder="contato@estabelecimento.com"
                      value={formData.email} onChange={handleChange} required />
                  </div>
                  <button type="button" className="auth-btn-primary" onClick={nextStep}>
                    Próximo <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* Etapa 2 - Acesso */}
              {step === 2 && (
                <div className="auth-animate-in" key="step2">
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Senha *</label>
                    <div className="password-wrapper">
                      <input type={showPassword ? 'text' : 'password'} name="password" style={{ ...inputStyle, paddingRight: '2.75rem' }}
                        placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleChange} required />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Confirmar Senha *</label>
                    <div className="password-wrapper">
                      <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" style={{ ...inputStyle, paddingRight: '2.75rem' }}
                        placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={handleChange} required />
                      <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="auth-btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <button type="button" className="auth-btn-primary" onClick={nextStep} style={{ flex: 2 }}>
                      Próximo <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa 3 - Endereço */}
              {step === 3 && (
                <div className="auth-animate-in" key="step3">
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Rua/Avenida *</label>
                    <input name="address_street" style={inputStyle} placeholder="Ex: Rua das Flores"
                      value={formData.address_street} onChange={handleChange} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Número *</label>
                      <input name="address_number" style={inputStyle} placeholder="123"
                        value={formData.address_number} onChange={handleChange} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Bairro *</label>
                      <input name="address_neighborhood" style={inputStyle} placeholder="Centro"
                        value={formData.address_neighborhood} onChange={handleChange} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Cidade</label>
                      <input name="address_city" style={inputStyle} placeholder="Capão da Canoa"
                        value={formData.address_city} onChange={handleChange} />
                    </div>
                    <div>
                      <label style={labelStyle}>UF</label>
                      <input name="address_state" style={inputStyle} placeholder="RS"
                        value={formData.address_state} onChange={handleChange} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>CEP</label>
                    <input name="address_zip" style={inputStyle} placeholder="95555-000"
                      value={formData.address_zip} onChange={handleChange} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="auth-btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <button type="button" className="auth-btn-primary" onClick={nextStep} style={{ flex: 2 }}>
                      Próximo <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa 4 - Configurações */}
              {step === 4 && (
                <div className="auth-animate-in" key="step4">
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Tempo de Preparo (minutos)</label>
                    <input type="number" name="preparation_minutes" style={inputStyle} placeholder="10"
                      value={formData.preparation_minutes} onChange={handleChange} min="1" max="120" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Confirmação de Coleta</label>
                      <select name="pickup_confirmation_type" value={formData.pickup_confirmation_type} onChange={handleChange} style={inputStyle}>
                        <option value="code">Código</option>
                        <option value="photo">Foto</option>
                        <option value="code_and_photo">Código + Foto</option>
                        <option value="none">Nenhuma</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Confirmação de Entrega</label>
                      <select name="delivery_confirmation_type" value={formData.delivery_confirmation_type} onChange={handleChange} style={inputStyle}>
                        <option value="code">Código</option>
                        <option value="photo">Foto</option>
                        <option value="code_and_photo">Código + Foto</option>
                        <option value="none">Nenhuma</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#166534' }}>
                      <strong>Praça e Tabela de Preços</strong> serão definidos pelo administrador após aprovação do cadastro.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="auth-btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <button type="submit" className="auth-btn-primary" disabled={isLoading} style={{ flex: 2 }}>
                      {isLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                          Criando conta...
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          Criar Conta <Check size={18} />
                        </span>
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
              <Link to="/client/login" className="auth-footer-link">Faça login</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ClientRegisterPage;
