import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Shield } from 'lucide-react';
import api from '@/lib/api';

const AdminIntegrationsPage = () => {
  const [credentials, setCredentials] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [form, setForm] = useState({
    restaurant_id: '',
    platform: 'IFOOD',
    client_id: '',
    client_secret: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [credsRes, restRes] = await Promise.all([
        api.get('/api/admin/platform-credentials'),
        api.get('/api/admin/establishments')
      ]);
      setCredentials(credsRes.data.credentials || []);
      setRestaurants(restRes.data.establishments || restRes.data || []);
    } catch {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.restaurant_id || !form.client_id || !form.client_secret) {
      setError('Preencha todos os campos');
      return;
    }
    try {
      await api.post('/api/admin/platform-credentials', {
        restaurant_id: parseInt(form.restaurant_id),
        platform: form.platform,
        client_id: form.client_id,
        client_secret: form.client_secret
      });
      setSuccess('Credencial salva com sucesso!');
      setShowForm(false);
      setForm({ restaurant_id: '', platform: 'IFOOD', client_id: '', client_secret: '' });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar credencial');
    }
  };

  const handleTest = async (credId) => {
    try {
      setTestingId(credId);
      setError('');
      const result = await api.post(`/api/admin/platform-credentials/${credId}/test`);
      if (result.data.success) {
        setSuccess('Conexão testada com sucesso!');
        loadData();
      } else {
        setError(result.data.error || 'Erro ao testar conexão');
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao testar conexão');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta credencial?')) return;
    try {
      await api.delete(`/api/admin/platform-credentials/${id}`);
      loadData();
    } catch {
      alert('Erro ao excluir');
    }
  };

  const getRestaurantName = (id) => {
    const r = restaurants.find(r => r.id === id);
    return r ? r.name : `Estabelecimento #${id}`;
  };

  const getPlatformInfo = (platform) => {
    const platforms = {
      'IFOOD': { name: 'iFood', color: '#ea1d2c', icon: 'iF' },
      'OPEN_DELIVERY': { name: 'Open Delivery', color: '#2563eb', icon: 'OD' },
      'RAPPI': { name: 'Rappi', color: '#ff441f', icon: 'RA' }
    };
    return platforms[platform] || { name: platform, color: '#64748b', icon: platform.substring(0, 2) };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Integrações</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Configure credenciais de plataformas externas por estabelecimento</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <Plus size={16} /> Nova Credencial
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> {success}</div>}

      {/* Modal de formulário */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={() => setShowForm(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '500px', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Nova Credencial de Plataforma</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Estabelecimento *</label>
                <select value={form.restaurant_id} onChange={e => setForm(p => ({ ...p, restaurant_id: e.target.value }))} required
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}>
                  <option value="">Selecione...</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Plataforma *</label>
                <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}>
                  <option value="IFOOD">iFood</option>
                  <option value="OPEN_DELIVERY">Open Delivery</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Client ID *</label>
                <input type="text" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} required
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="ID do cliente na plataforma" />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Client Secret *</label>
                <input type="password" value={form.client_secret} onChange={e => setForm(p => ({ ...p, client_secret: e.target.value }))} required
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Chave secreta da plataforma" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Shield size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} /> Salvar Credencial
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Lista de credenciais */}
      {credentials.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Globe size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhuma credencial configurada</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Adicione credenciais para integrar com iFood e outras plataformas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {credentials.map(cred => {
            const platformInfo = getPlatformInfo(cred.platform);
            return (
              <div key={cred.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${cred.is_active ? platformInfo.color : '#64748b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: platformInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                      {platformInfo.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{platformInfo.name}</span>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: cred.is_active ? '#dcfce7' : '#f1f5f9', color: cred.is_active ? '#166534' : '#64748b' }}>
                          {cred.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                        {getRestaurantName(cred.restaurant_id)}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Client ID: {cred.client_id ? `${cred.client_id.substring(0, 8)}...` : 'Não configurado'}
                      </p>
                      {cred.expires_at && (
                        <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          Token expira: {new Date(cred.expires_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTest(cred.id)} disabled={testingId === cred.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#8b5cf6', color: 'white', cursor: testingId === cred.id ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: testingId === cred.id ? 0.7 : 1 }}>
                      <RefreshCw size={14} className={testingId === cred.id ? 'animate-spin' : ''} />
                      {testingId === cred.id ? 'Testando...' : 'Testar Conexão'}
                    </button>
                    <button onClick={() => handleDelete(cred.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.75rem' }}>
          <Globe size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Como configurar o iFood
        </h3>
        <ol style={{ fontSize: '0.8125rem', color: '#1e3a5f', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>Acesse o <a href="https://portal-developers.ifood.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Portal de Desenvolvedores do iFood</a></li>
          <li>Crie uma aplicação e obtenha o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
          <li>Configure o webhook URL: <code style={{ background: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>https://muvlog-api.onrender.com/api/webhooks/ifood</code></li>
          <li>Adicione a credencial aqui e clique em "Testar Conexão"</li>
          <li>Após conectado, os pedidos do iFood serão recebidos automaticamente</li>
        </ol>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminIntegrationsPage;
