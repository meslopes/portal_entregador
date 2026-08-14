import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, X, Save, RefreshCw, AlertCircle, CheckCircle, CloudRain, TrendingUp, Calendar, XCircle } from 'lucide-react';
import { adminService } from '@/lib/api';

const AdminDynamicPricingPage = () => {
  const [configs, setConfigs] = useState([]);
  const [squares, setSquares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    square_id: '',
    rainy_day_active: false, rainy_day_bonus: '3.00',
    high_demand_active: false, high_demand_threshold: '5', high_demand_bonus: '2.00',
    holiday_active: false, holiday_bonus: '5.00',
    cancellation_fee_active: false, cancellation_fee: '5.00'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, squaresRes] = await Promise.all([
        adminService.getDynamicPricing(),
        adminService.getSquares()
      ]);
      setConfigs(configsRes.dynamic_pricing || []);
      setSquares(squaresRes.squares || []);
    } catch {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      square_id: '',
      rainy_day_active: false, rainy_day_bonus: '3.00',
      high_demand_active: false, high_demand_threshold: '5', high_demand_bonus: '2.00',
      holiday_active: false, holiday_bonus: '5.00',
      cancellation_fee_active: false, cancellation_fee: '5.00'
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (config) => {
    setForm({
      square_id: String(config.square_id || ''),
      rainy_day_active: config.rainy_day_active || false,
      rainy_day_bonus: String(config.rainy_day_bonus || '3.00'),
      high_demand_active: config.high_demand_active || false,
      high_demand_threshold: String(config.high_demand_threshold || '5'),
      high_demand_bonus: String(config.high_demand_bonus || '2.00'),
      holiday_active: config.holiday_active || false,
      holiday_bonus: String(config.holiday_bonus || '5.00'),
      cancellation_fee_active: config.cancellation_fee_active || false,
      cancellation_fee: String(config.cancellation_fee || '5.00')
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.square_id) { setError('Praça é obrigatória'); return; }
    try {
      const data = {
        square_id: parseInt(form.square_id),
        rainy_day_active: form.rainy_day_active,
        rainy_day_bonus: parseFloat(form.rainy_day_bonus) || 3.00,
        high_demand_active: form.high_demand_active,
        high_demand_threshold: parseInt(form.high_demand_threshold) || 5,
        high_demand_bonus: parseFloat(form.high_demand_bonus) || 2.00,
        holiday_active: form.holiday_active,
        holiday_bonus: parseFloat(form.holiday_bonus) || 5.00,
        cancellation_fee_active: form.cancellation_fee_active,
        cancellation_fee: parseFloat(form.cancellation_fee) || 5.00
      };
      if (editingId) {
        await adminService.updateDynamicPricing(editingId, data);
        setSuccess('Configuração atualizada!');
      } else {
        await adminService.createDynamicPricing(data);
        setSuccess('Configuração criada!');
      }
      resetForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta configuração de taxas?')) return;
    try {
      await adminService.deleteDynamicPricing(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const toggleActive = async (config, field) => {
    try {
      await adminService.updateDynamicPricing(config.id, { [field]: !config[field] });
      loadData();
    } catch {
      alert('Erro ao atualizar');
    }
  };

  const getSquareName = (id) => {
    const sq = squares.find(s => s.id === id);
    return sq ? `${sq.name} (${sq.city})` : `Praça #${id}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Taxas Adicionais</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Configure taxas de chuva, demanda, feriado e cancelamento por praça</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nova Configuração
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><AlertCircle size={16} /> {error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><CheckCircle size={16} /> {success}</div>}

      {configs.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <DollarSign size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '0.5rem' }}>Nenhuma configuração de taxas adicionais</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Crie uma configuração para cada praça</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {configs.map(config => (
            <div key={config.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{getSquareName(config.square_id)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleEdit(config)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(config.id)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {/* Taxa de Chuva */}
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: config.rainy_day_active ? '#eff6ff' : '#f8fafc', border: `1px solid ${config.rainy_day_active ? '#bfdbfe' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CloudRain size={14} color={config.rainy_day_active ? '#2563eb' : '#94a3b8'} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Taxa de Chuva</span>
                    </div>
                    <button onClick={() => toggleActive(config, 'rainy_day_active')} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', background: config.rainy_day_active ? '#2563eb' : '#e2e8f0', color: config.rainy_day_active ? 'white' : '#64748b', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 600 }}>
                      {config.rainy_day_active ? 'ATIVA' : 'INATIVA'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>+R$ {parseFloat(config.rainy_day_bonus || 0).toFixed(2)}</span>
                </div>

                {/* Alta Demanda */}
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: config.high_demand_active ? '#fefce8' : '#f8fafc', border: `1px solid ${config.high_demand_active ? '#fde68a' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <TrendingUp size={14} color={config.high_demand_active ? '#ca8a04' : '#94a3b8'} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Alta Demanda</span>
                    </div>
                    <button onClick={() => toggleActive(config, 'high_demand_active')} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', background: config.high_demand_active ? '#ca8a04' : '#e2e8f0', color: config.high_demand_active ? 'white' : '#64748b', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 600 }}>
                      {config.high_demand_active ? 'ATIVA' : 'INATIVA'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>+R$ {parseFloat(config.high_demand_bonus || 0).toFixed(2)}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', marginLeft: '0.25rem' }}>({config.high_demand_threshold}+ pedidos)</span>
                </div>

                {/* Feriado */}
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: config.holiday_active ? '#fdf2f8' : '#f8fafc', border: `1px solid ${config.holiday_active ? '#fbcfe8' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Calendar size={14} color={config.holiday_active ? '#db2777' : '#94a3b8'} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Feriado</span>
                    </div>
                    <button onClick={() => toggleActive(config, 'holiday_active')} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', background: config.holiday_active ? '#db2777' : '#e2e8f0', color: config.holiday_active ? 'white' : '#64748b', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 600 }}>
                      {config.holiday_active ? 'ATIVA' : 'INATIVA'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>+R$ {parseFloat(config.holiday_bonus || 0).toFixed(2)}</span>
                </div>

                {/* Cancelamento */}
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: config.cancellation_fee_active ? '#fef2f2' : '#f8fafc', border: `1px solid ${config.cancellation_fee_active ? '#fecaca' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <XCircle size={14} color={config.cancellation_fee_active ? '#dc2626' : '#94a3b8'} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Cancelamento</span>
                    </div>
                    <button onClick={() => toggleActive(config, 'cancellation_fee_active')} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', background: config.cancellation_fee_active ? '#dc2626' : '#e2e8f0', color: config.cancellation_fee_active ? 'white' : '#64748b', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 600 }}>
                      {config.cancellation_fee_active ? 'ATIVA' : 'INATIVA'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>R$ {parseFloat(config.cancellation_fee || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={resetForm} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Editar Taxas' : 'Nova Configuração de Taxas'}</h2>
              <button onClick={resetForm} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Praça *</label>
                <select value={form.square_id} onChange={e => setForm(p => ({ ...p, square_id: e.target.value }))} required disabled={!!editingId}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', opacity: editingId ? 0.6 : 1 }}>
                  <option value="">Selecione uma praça</option>
                  {squares.map(sq => <option key={sq.id} value={sq.id}>{sq.name} ({sq.city}/{sq.state})</option>)}
                </select>
              </div>

              {/* Taxa de Chuva */}
              <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CloudRain size={16} color="#2563eb" />
                    <span style={{ fontWeight: 600, color: '#1e3a5f', fontSize: '0.875rem' }}>Taxa de Chuva</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.rainy_day_active} onChange={e => setForm(p => ({ ...p, rainy_day_active: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>Ativar</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#374151', marginBottom: '0.25rem' }}>Valor do bônus (R$)</label>
                  <input type="number" step="0.01" value={form.rainy_day_bonus} onChange={e => setForm(p => ({ ...p, rainy_day_bonus: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #bfdbfe', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Alta Demanda */}
              <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: '#fefce8', border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={16} color="#ca8a04" />
                    <span style={{ fontWeight: 600, color: '#713f12', fontSize: '0.875rem' }}>Alta Demanda</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.high_demand_active} onChange={e => setForm(p => ({ ...p, high_demand_active: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>Ativar</span>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#374151', marginBottom: '0.25rem' }}>Limite de pedidos</label>
                    <input type="number" value={form.high_demand_threshold} onChange={e => setForm(p => ({ ...p, high_demand_threshold: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#374151', marginBottom: '0.25rem' }}>Bônus (R$)</label>
                    <input type="number" step="0.01" value={form.high_demand_bonus} onChange={e => setForm(p => ({ ...p, high_demand_bonus: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #fde68a', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Feriado */}
              <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: '#fdf2f8', border: '1px solid #fbcfe8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="#db2777" />
                    <span style={{ fontWeight: 600, color: '#831843', fontSize: '0.875rem' }}>Feriado</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.holiday_active} onChange={e => setForm(p => ({ ...p, holiday_active: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>Ativar</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#374151', marginBottom: '0.25rem' }}>Valor do bônus (R$)</label>
                  <input type="number" step="0.01" value={form.holiday_bonus} onChange={e => setForm(p => ({ ...p, holiday_bonus: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #fbcfe8', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Cancelamento */}
              <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <XCircle size={16} color="#dc2626" />
                    <span style={{ fontWeight: 600, color: '#7f1d1d', fontSize: '0.875rem' }}>Taxa de Cancelamento</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.cancellation_fee_active} onChange={e => setForm(p => ({ ...p, cancellation_fee_active: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#374151' }}>Ativar</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#374151', marginBottom: '0.25rem' }}>Valor da taxa (R$)</label>
                  <input type="number" step="0.01" value={form.cancellation_fee} onChange={e => setForm(p => ({ ...p, cancellation_fee: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #fecaca', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={resetForm} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Save size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                  {editingId ? 'Atualizar' : 'Criar Configuração'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDynamicPricingPage;
