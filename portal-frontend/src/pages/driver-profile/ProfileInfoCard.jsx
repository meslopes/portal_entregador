import React from 'react';
import { Save } from 'lucide-react';
import { cardStyle, inputStyle, saveBtnStyle, FormField } from './shared';

const gridStyle = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem',
};
const disabledInput = {
  ...inputStyle, background: '#f8fafc', color: '#64748b',
};

const ProfileInfoCard = ({ profileData, setProfileData, onSave, isSaving }) => (
  <div style={cardStyle}>
    <div style={gridStyle}>
      <FormField label="Nome">
        <input
          type="text"
          value={profileData.first_name}
          onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
          style={inputStyle}
        />
      </FormField>
      <FormField label="Sobrenome">
        <input
          type="text"
          value={profileData.last_name}
          onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
          style={inputStyle}
        />
      </FormField>
    </div>

    <FormField label="Email">
      <input type="email" value={profileData.email} disabled style={disabledInput} />
    </FormField>

    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block', fontSize: '0.8125rem', fontWeight: 500,
        color: '#374151', marginBottom: '0.375rem',
      }}>Telefone</label>
      <input
        type="tel"
        value={profileData.phone}
        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
        placeholder="(11) 99999-9999"
        style={inputStyle}
      />
    </div>

    <button onClick={onSave} disabled={isSaving} style={saveBtnStyle(isSaving)}>
      <Save size={18} />
      {isSaving ? 'Salvando...' : 'Salvar Perfil'}
    </button>
  </div>
);

export default ProfileInfoCard;
