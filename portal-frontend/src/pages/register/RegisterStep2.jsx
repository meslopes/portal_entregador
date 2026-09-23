import React from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

const RegisterStep2 = ({
  formData, handleChange,
  showPassword, setShowPassword,
  showConfirmPassword, setShowConfirmPassword,
  prevStep, nextStep,
}) => (
  <div className="auth-animate-in">
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
      <button type="button" className="auth-btn-primary" onClick={nextStep} style={{ flex: 2 }}>
        Próximo <ArrowRight size={18} />
      </button>
    </div>
  </div>
);

export default RegisterStep2;
