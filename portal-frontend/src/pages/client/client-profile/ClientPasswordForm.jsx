import React from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';

const passwordInputStyle = {
  width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem',
  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
  fontSize: '0.9375rem', outline: 'none'
};

const toggleButtonStyle = {
  position: 'absolute', right: '0.75rem', top: '50%',
  transform: 'translateY(-50%)', background: 'none',
  border: 'none', cursor: 'pointer', color: '#64748b'
};

const PasswordField = ({ label, value, onChange, placeholder, visible, onToggle }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={passwordInputStyle}
      />
      <button type="button" onClick={onToggle} style={toggleButtonStyle}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const ClientPasswordForm = ({ passwordData, setPasswordData, showPassword, setShowPassword, isSaving, onChangePassword }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem',
    padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <PasswordField
      label="Senha Atual"
      value={passwordData.current_password}
      onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
      placeholder="Digite sua senha atual"
      visible={showPassword.current}
      onToggle={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
    />

    <PasswordField
      label="Nova Senha"
      value={passwordData.new_password}
      onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
      placeholder="Mínimo 6 caracteres"
      visible={showPassword.new}
      onToggle={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
    />

    <PasswordField
      label="Confirmar Nova Senha"
      value={passwordData.confirm_password}
      onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
      placeholder="Repita a nova senha"
      visible={showPassword.confirm}
      onToggle={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
    />

    <button
      onClick={onChangePassword}
      disabled={isSaving || !passwordData.current_password || !passwordData.new_password}
      style={{
        width: '100%', padding: '0.75rem',
        borderRadius: '0.5rem', border: 'none',
        background: '#0d9488', color: 'white',
        fontSize: '0.9375rem', fontWeight: 600,
        cursor: isSaving ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', opacity: isSaving ? 0.7 : 1
      }}
    >
      <Key size={18} />
      {isSaving ? 'Alterando...' : 'Alterar Senha'}
    </button>
  </div>
);

export default ClientPasswordForm;
