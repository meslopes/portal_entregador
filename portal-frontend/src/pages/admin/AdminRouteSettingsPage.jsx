import React, { useState, useEffect } from 'react';
import {
  Save, RefreshCw, AlertCircle, CheckCircle,
  Route, Clock, MapPin, Zap, Bell, Package
} from 'lucide-react';
import api from '@/lib/api';

const AdminRouteSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/route-settings/');
      setSettings(res.data.settings);
    } catch (err) {
      setError('Erro ao carregar configurações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await api.put('/api/route-settings/', settings);
      setSettings(res.data.settings);
      setSuccess('Configurações salvas com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Configurações de Roteirização
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Configure como o sistema cria e geria rotas de entrega
        </p>
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Auto-Roteirização */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={20} style={{ color: '#2563eb' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Auto-Roteirização</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sistema cria rotas automaticamente</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Ativar Auto-Roteirização</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sistema analisa pedidos e cria rotas automaticamente</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.auto_routing_enabled}
                onChange={e => handleChange('auto_routing_enabled', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                background: settings.auto_routing_enabled ? '#2563eb' : '#94a3b8',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px',
                  left: settings.auto_routing_enabled ? '27px' : '3px', bottom: '3px',
                  background: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Intervalo de Análise (minutos)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.auto_routing_interval_min}
              onChange={e => handleChange('auto_routing_interval_min', parseInt(e.target.value) || 5)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>De 1 a 60 minutos</p>
          </div>
        </div>
      </div>

      {/* Limites */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Route size={20} style={{ color: '#16a34a' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Limites</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Limites de pedidos e distância</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Máx. Pedidos (Auto)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={settings.max_orders_auto}
                onChange={e => handleChange('max_orders_auto', parseInt(e.target.value) || 6)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Máx. Pedidos (Manual)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={settings.max_orders_manual}
                onChange={e => handleChange('max_orders_manual', parseInt(e.target.value) || 10)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Distância Máxima entre Pedidos (km)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              value={settings.max_distance_km}
              onChange={e => handleChange('max_distance_km', parseFloat(e.target.value) || 10)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Status de Pedidos */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Package size={20} style={{ color: '#f59e0b' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Status de Pedidos</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Quais status incluir na roteirização</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Prontos (READY)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos prontos para coleta</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" checked={settings.include_ready} onChange={e => handleChange('include_ready', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: settings.include_ready ? '#2563eb' : '#94a3b8', borderRadius: '24px', transition: '0.3s' }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.include_ready ? '27px' : '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Em Preparo (PREPARING)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos sendo preparados</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" checked={settings.include_preparing} onChange={e => handleChange('include_preparing', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: settings.include_preparing ? '#2563eb' : '#94a3b8', borderRadius: '24px', transition: '0.3s' }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.include_preparing ? '27px' : '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Aceitos (ACCEPTED)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos aceitos pelo restaurante</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" checked={settings.include_accepted} onChange={e => handleChange('include_accepted', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: settings.include_accepted ? '#2563eb' : '#94a3b8', borderRadius: '24px', transition: '0.3s' }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.include_accepted ? '27px' : '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Pendentes (PENDING)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos aguardando aceite</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" checked={settings.include_pending} onChange={e => handleChange('include_pending', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: settings.include_pending ? '#2563eb' : '#94a3b8', borderRadius: '24px', transition: '0.3s' }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.include_pending ? '27px' : '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Agendados (SCHEDULED)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos agendados para horário futuro</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input type="checkbox" checked={settings.include_scheduled} onChange={e => handleChange('include_scheduled', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: settings.include_scheduled ? '#2563eb' : '#94a3b8', borderRadius: '24px', transition: '0.3s' }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: settings.include_scheduled ? '27px' : '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          {settings.include_scheduled && (
            <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Antecedência para Agendados (minutos)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.scheduled_advance_min}
                onChange={e => handleChange('scheduled_advance_min', parseInt(e.target.value) || 30)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Incluir agendados que começam em até {settings.scheduled_advance_min} minutos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Algoritmo */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MapPin size={20} style={{ color: '#8b5cf6' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Algoritmo</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pesos e thresholds do algoritmo</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Peso da Direção: {Math.round(settings.direction_weight * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.direction_weight * 100}
              onChange={e => handleChange('direction_weight', parseInt(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Distância</span>
              <span>Direção</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Economia Mín. (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.min_time_savings_min}
                onChange={e => handleChange('min_time_savings_min', parseInt(e.target.value) || 10)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Clusterização Mín.: {Math.round(settings.min_clusterization * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.min_clusterization * 100}
                onChange={e => handleChange('min_clusterization', parseInt(e.target.value) / 100)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notificações */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bell size={20} style={{ color: '#f59e0b' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Notificações</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Alertas sobre rotas automáticas</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Notificar Admin</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Alertar quando sistema criar rota automática</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.notify_admin_auto_route}
                onChange={e => handleChange('notify_admin_auto_route', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                background: settings.notify_admin_auto_route ? '#2563eb' : '#94a3b8',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px',
                  left: settings.notify_admin_auto_route ? '27px' : '3px', bottom: '3px',
                  background: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>Notificar Entregador</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Alertar entregador sobre nova rota</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.notify_driver_auto_route}
                onChange={e => handleChange('notify_driver_auto_route', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                background: settings.notify_driver_auto_route ? '#2563eb' : '#94a3b8',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px',
                  left: settings.notify_driver_auto_route ? '27px' : '3px', bottom: '3px',
                  background: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          onClick={loadSettings}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            border: '1.5px solid #e2e8f0', background: 'white',
            fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} /> Restaurar Padrão
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            border: 'none', background: saving ? '#94a3b8' : '#2563eb',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminRouteSettingsPage;
