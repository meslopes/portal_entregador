import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Store, Key, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import ClientProfileForm from './client-profile/ClientProfileForm';
import ClientEstablishmentForm from './client-profile/ClientEstablishmentForm';
import ClientPasswordForm from './client-profile/ClientPasswordForm';

const ClientProfilePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [establishmentData, setEstablishmentData] = useState({
    name: '',
    address: '',
    phone: '',
    description: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/user/profile');
      const data = response.data;

      setProfileData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
      });

      if (data.customer) {
        setEstablishmentData({
          name: data.customer.name || '',
          address: data.customer.address || '',
          phone: data.customer.phone || '',
          description: data.customer.description || '',
        });
      }
    } catch (err) {
      setError('Erro ao carregar perfil');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await api.put('/api/user/profile', profileData);
      setSuccess('Perfil atualizado com sucesso!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar perfil');
      setSuccess('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEstablishment = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await api.put('/api/user/profile', establishmentData);
      setSuccess('Dados do estabelecimento atualizados!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar estabelecimento');
      setSuccess('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('As senhas não coincidem');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await api.post('/api/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setSuccess('Senha alterada com sucesso!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'establishment', label: 'Estabelecimento', icon: Store },
    { id: 'password', label: 'Senha', icon: Key },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#0d9488',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/client')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
          padding: '0.25rem', display: 'flex'
        }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Meu Perfil
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Gerencie seus dados e do estabelecimento
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem',
        background: '#f1f5f9', borderRadius: '0.75rem',
        padding: '0.25rem', marginBottom: '1.5rem'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '0.75rem',
                borderRadius: '0.5rem', border: 'none',
                background: isActive ? 'white' : 'transparent',
                color: isActive ? '#0d9488' : '#64748b',
                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', transition: 'all 0.2s',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          color: '#16a34a', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Tab: Perfil */}
      {activeTab === 'profile' && (
        <ClientProfileForm
          profileData={profileData}
          setProfileData={setProfileData}
          isSaving={isSaving}
          onSave={handleSaveProfile}
        />
      )}

      {/* Tab: Estabelecimento */}
      {activeTab === 'establishment' && (
        <ClientEstablishmentForm
          establishmentData={establishmentData}
          setEstablishmentData={setEstablishmentData}
          isSaving={isSaving}
          onSave={handleSaveEstablishment}
        />
      )}

      {/* Tab: Senha */}
      {activeTab === 'password' && (
        <ClientPasswordForm
          passwordData={passwordData}
          setPasswordData={setPasswordData}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          isSaving={isSaving}
          onChangePassword={handleChangePassword}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientProfilePage;
