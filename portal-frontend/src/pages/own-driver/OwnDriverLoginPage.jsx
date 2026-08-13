import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, AlertCircle, Truck, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

const OwnDriverLoginPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) { setError('Informe seu telefone'); return; }
    if (!pin.trim() || pin.length !== 4) { setError('Informe o PIN de 4 dígitos'); return; }

    try {
      setLoading(true);
      const res = await api.post('/api/own-driver/login', { phone, pin });
      localStorage.setItem('own_driver_token', res.data.token);
      localStorage.setItem('own_driver_data', JSON.stringify(res.data.driver));
      localStorage.setItem('own_driver_restaurant', JSON.stringify(res.data.restaurant));
      navigate('/own-driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '2rem',
        width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '50%',
            background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Truck size={32} style={{ color: '#0d9488' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            muv.log
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Área do Entregador Próprio
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem',
            marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Telefone
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(51) 99999-9999"
                style={{
                  width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
                  fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              PIN (4 dígitos)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
                maxLength={4}
                inputMode="numeric"
                style={{
                  width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
                  fontSize: '1.25rem', outline: 'none', boxSizing: 'border-box',
                  letterSpacing: '0.5rem', textAlign: 'center', fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem'
                }}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.875rem', borderRadius: '0.5rem',
              border: 'none', background: '#0d9488', color: 'white',
              fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>
          Não tem seu PIN? Peça ao estabelecimento para cadastrar.
        </p>
      </div>
    </div>
  );
};

export default OwnDriverLoginPage;
