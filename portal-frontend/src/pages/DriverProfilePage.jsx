import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Car, Key, ArrowLeft, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import ProfileInfoCard from './driver-profile/ProfileInfoCard';
import VehicleInfoCard from './driver-profile/VehicleInfoCard';
import PasswordForm from './driver-profile/PasswordForm';

const DriverProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
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

  const [vehicleData, setVehicleData] = useState({
    vehicle_type: 'MOTORCYCLE',
    vehicle_plate: '',
    vehicle_model: '',
    vehicle_year: '',
    pix_key: '',
    bank_account: '',
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

      if (data.driver) {
        setVehicleData({
          vehicle_type: data.driver.vehicle_type || 'MOTORCYCLE',
          vehicle_plate: data.driver.vehicle_plate || '',
          vehicle_model: data.driver.vehicle_model || '',
          vehicle_year: data.driver.vehicle_year || '',
          pix_key: data.driver.pix_key || '',
          bank_account: data.driver.bank_account || '',
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
      updateUser({ ...user, ...profileData });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar perfil');
      setSuccess('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVehicle = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await api.put('/api/user/profile', vehicleData);
      setSuccess('Dados do veículo atualizados!');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar veículo');
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
    { id: 'vehicle', label: 'Veículo', icon: Car },
    { id: 'password', label: 'Senha', icon: Key },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{
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
            Gerencie seus dados pessoais
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
                color: isActive ? '#2563eb' : '#64748b',
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

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ProfileInfoCard
          profileData={profileData}
          setProfileData={setProfileData}
          onSave={handleSaveProfile}
          isSaving={isSaving}
        />
      )}

      {activeTab === 'vehicle' && (
        <VehicleInfoCard
          vehicleData={vehicleData}
          setVehicleData={setVehicleData}
          onSave={handleSaveVehicle}
          isSaving={isSaving}
        />
      )}

      {activeTab === 'password' && (
        <PasswordForm
          passwordData={passwordData}
          setPasswordData={setPasswordData}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          onSave={handleChangePassword}
          isSaving={isSaving}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DriverProfilePage;
