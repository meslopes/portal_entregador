import React from 'react';
import { Key } from 'lucide-react';
import { cardStyle, saveBtnStyle, FormField, PasswordField } from './shared';

const PasswordForm = ({
  passwordData, setPasswordData,
  showPassword, setShowPassword,
  onSave, isSaving,
}) => (
  <div style={cardStyle}>
    <FormField label="Senha Atual">
      <PasswordField
        value={passwordData.current_password}
        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
        visible={showPassword.current}
        onToggle={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
        placeholder="Digite sua senha atual"
      />
    </FormField>

    <FormField label="Nova Senha">
      <PasswordField
        value={passwordData.new_password}
        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
        visible={showPassword.new}
        onToggle={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
        placeholder="Mínimo 6 caracteres"
      />
    </FormField>

    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block', fontSize: '0.8125rem', fontWeight: 500,
        color: '#374151', marginBottom: '0.375rem',
      }}>Confirmar Nova Senha</label>
      <PasswordField
        value={passwordData.confirm_password}
        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
        visible={showPassword.confirm}
        onToggle={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
        placeholder="Repita a nova senha"
      />
    </div>

    <button
      onClick={onSave}
      disabled={isSaving || !passwordData.current_password || !passwordData.new_password}
      style={saveBtnStyle(isSaving)}
    >
      <Key size={18} />
      {isSaving ? 'Alterando...' : 'Alterar Senha'}
    </button>
  </div>
);

export default PasswordForm;
