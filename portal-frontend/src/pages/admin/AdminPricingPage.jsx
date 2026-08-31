import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit, Trash2, X, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { adminService } from '@/lib/api';
import { showToast } from '@/components/Toast';

const AdminPricingPage = () => {
  const [tables, setTables] = useState([]);
  const [squares, setSquares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', square_id: '', price_per_km: '2.95',
    min_distance_km: '4', min_delivery_fee: '', max_delivery_fee: '50',
    driver_percentage: '70', is_active: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tablesRes, squaresRes] = await Promise.all([
        adminService.getPricingTables(),
        adminService.getSquares()
      ]);
      setTables(tablesRes.pricing_tables || []);
      setSquares(squaresRes.squares || []);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', square_id: '', price_per_km: '2.95', min_distance_km: '4', min_delivery_fee: '', max_delivery_fee: '50', driver_percentage: '70', is_active: true });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (table) => {
    setForm({
      name: table.name || '', description: table.description || '',
      square_id: String(table.square_id || ''),
      price_per_km: String(table.price_per_km || '2.95'),
      min_distance_km: String(table.min_distance_km || '4'),
      min_delivery_fee: String(table.min_delivery_fee || ''),
      max_delivery_fee: String(table.max_delivery_fee || '50'),
      driver_percentage: String(table.driver_percentage || '70'),
      is_active: table.is_active !== false
    });
    setEditingId(table.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.square_id) { setError('Nome e praça são obrigatórios'); return; }
    try {
      const data = {
        name: form.name, description: form.description || null,
        square_id: parseInt(form.square_id),
        price_per_km: parseFloat(form.price_per_km) || 2.95,
        min_distance_km: parseFloat(form.min_distance_km) || 4,
        min_delivery_fee: form.min_delivery_fee ? parseFloat(form.min_delivery_fee) : null,
        max_delivery_fee: parseFloat(form.max_delivery_fee) || 50,
        driver_percentage: parseFloat(form.driver_percentage) || 70,
        is_active: form.is_active
      };
      if (editingId) {
        await adminService.updatePricingTable(editingId, data);
        setSuccess('Tabela atualizada!');
      } else {
        await adminService.createPricingTable(data);
        setSuccess('Tabela criada!');
      }
      resetForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Excluir tabela "${name}"?`)) return;
    try {
      await adminService.deletePricingTable(id);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Tabelas de Preços</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie as tabelas de preços por praça</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nova Tabela
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><AlertCircle size={16} /> {error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><CheckCircle size={16} /> {success}</div>}

      {/* Lista de tabelas */}
      {tables.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <DollarSign size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '0.5rem' }}>Nenhuma tabela de preços cadastrada</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Crie uma tabela para configurar preços por km</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {tables.map(table => (
            <div key={table.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${table.is_active ? '#2563eb' : '#64748b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{table.name}</span>
                    {!table.is_active && <span style={{ padding: '0.125rem 0.375rem', background: '#f1f5f9', borderRadius: '9999px', fontSize: '0.625rem', color: '#64748b' }}>Inativa</span>}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {getSquareName(table.square_id)} {table.description ? `• ${table.description}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}><strong>R$/km:</strong> R$ {parseFloat(table.price_per_km || 0).toFixed(2)}</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}><strong>Mín:</strong> {table.min_distance_km} km</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}><strong>Frete mín:</strong> R$ {parseFloat(table.min_delivery_fee || 0).toFixed(2)}</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}><strong>Frete máx:</strong> R$ {parseFloat(table.max_delivery_fee || 50).toFixed(2)}</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}><strong>Entregador:</strong> {table.driver_percentage}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleEdit(table)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(table.id, table.name)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
                    <Trash2 size={16} />
                  </button>
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
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Editar Tabela' : 'Nova Tabela de Preços'}</h2>
              <button onClick={resetForm} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome da Tabela *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Tabela A, Tabela VIP" required style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '374151', marginBottom: '0.375rem' }}>Praça *</label>
                <select value={form.square_id} onChange={e => setForm(p => ({ ...p, square_id: e.target.value }))} required style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}>
                  <option value="">Selecione uma praça</option>
                  {squares.map(sq => <option key={sq.id} value={sq.id}>{sq.name} ({sq.city}/{sq.state})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Descrição</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição opcional" style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>R$ por km *</label>
                  <input type="number" step="0.01" value={form.price_per_km} onChange={e => setForm(p => ({ ...p, price_per_km: e.target.value }))} required style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Distância mín. (km)</label>
                  <input type="number" step="0.5" value={form.min_distance_km} onChange={e => setForm(p => ({ ...p, min_distance_km: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Frete mínimo (R$)</label>
                  <input type="number" step="0.01" value={form.min_delivery_fee} onChange={e => setForm(p => ({ ...p, min_delivery_fee: e.target.value }))} placeholder="Auto (R$/km × mín km)" style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Frete máximo (R$)</label>
                  <input type="number" step="0.01" value={form.max_delivery_fee} onChange={e => setForm(p => ({ ...p, max_delivery_fee: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>% Entregador</label>
                  <input type="number" step="1" value={form.driver_percentage} onChange={e => setForm(p => ({ ...p, driver_percentage: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#374151' }}>Tabela ativa</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={resetForm} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Save size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                  {editingId ? 'Atualizar' : 'Criar Tabela'}
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

export default AdminPricingPage;
