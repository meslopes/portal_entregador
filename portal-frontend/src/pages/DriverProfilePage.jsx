import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, Car, Key, CreditCard, Save,
  ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

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
      updateUser({ ...user, ...profileData });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar perfil');
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

      {/* Tab: Perfil */}
      {activeTab === 'profile' && (
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Nome
              </label>
              <input
                type="text"
                value={profileData.first_name}
                onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Sobrenome
              </label>
              <input
                type="text"
                value={profileData.last_name}
                onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              disabled
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none',
                background: '#f8fafc', color: '#94a3b8'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Telefone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: '0.5rem', border: 'none',
              background: '#2563eb', color: 'white',
              fontSize: '0.9375rem', fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={18} />
            {isSaving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      )}

      {/* Tab: Veículo */}
      {activeTab === 'vehicle' && (
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Tipo de Veículo
            </label>
            <select
              value={vehicleData.vehicle_type}
              onChange={e => setVehicleData({ ...vehicleData, vehicle_type: e.target.value })}
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none', background: 'white'
              }}
            >
              <option value="MOTORCYCLE">Moto</option>
              <option value="CAR">Carro</option>
              <option value="BICYCLE">Bicicleta</option>
              <option value="FOOT">A pé</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Placa
              </label>
              <input
                type="text"
                value={vehicleData.vehicle_plate}
                onChange={e => setVehicleData({ ...vehicleData, vehicle_plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none', textTransform: 'uppercase'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Modelo
              </label>
              <input
                type="text"
                value={vehicleData.vehicle_model}
                onChange={e => setVehicleData({ ...vehicleData, vehicle_model: e.target.value })}
                placeholder="Ex: Honda CG 160"
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Ano
            </label>
            <input
              type="number"
              value={vehicleData.vehicle_year}
              onChange={e => setVehicleData({ ...vehicleData, vehicle_year: e.target.value })}
              placeholder="Ex: 2023"
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Chave PIX
            </label>
            <input
              type="text"
              value={vehicleData.pix_key}
              onChange={e => setVehicleData({ ...vehicleData, pix_key: e.target.value })}
              placeholder="Sua chave PIX (CPF, email ou telefone)"
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Dados Bancários (opcional)
            </label>
            <input
              type="text"
              value={vehicleData.bank_account}
              onChange={e => setVehicleData({ ...vehicleData, bank_account: e.target.value })}
              placeholder="Agência + Conta"
              style={{
                width: '100%', padding: '0.625rem 0.75rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.9375rem', outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSaveVehicle}
            disabled={isSaving}
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: '0.5rem', border: 'none',
              background: '#2563eb', color: 'white',
              fontSize: '0.9375rem', fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={18} />
            {isSaving ? 'Salvando...' : 'Salvar Veículo'}
          </button>
        </div>
      )}

      {/* Tab: Senha */}
      {activeTab === 'password' && (
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Senha Atual
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Digite sua senha atual"
                style={{
                  width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#94a3b8'
                }}
              >
                {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Nova Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#94a3b8'
                }}
              >
                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Confirmar Nova Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Repita a nova senha"
                style={{
                  width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                  fontSize: '0.9375rem', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#94a3b8'
                }}
              >
                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isSaving || !passwordData.current_password || !passwordData.new_password}
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: '0.5rem', border: 'none',
              background: '#2563eb', color: 'white',
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
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DriverProfilePage;
