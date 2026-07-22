import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit, Trash2, AlertCircle, CheckCircle,
  Store, Users, Package, X
} from 'lucide-react';
import { adminService } from '@/lib/api';

const AdminSquaresPage = () => {
  const [squares, setSquares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', city: '', state: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadSquares(); }, []);

  const loadSquares = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSquares();
      setSquares(data.squares || []);
    } catch (err) {
      setError('Erro ao carregar praças');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setFormData({ name: '', city: '', state: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (sq) => {
    setEditing(sq);
    setFormData({ name: sq.name, city: sq.city, state: sq.state });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.state) {
      setFormError('Todos os campos são obrigatórios');
      return;
    }
    try {
      setFormLoading(true);
      if (editing) {
        await adminService.updateSquare(editing.id, formData);
      } else {
        await adminService.createSquare(formData);
      }
      setShowForm(false);
      loadSquares();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta praça?')) return;
    try {
      await adminService.deleteSquare(id);
      loadSquares();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Praças</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie as cidades onde o sistema opera</p>
        </div>
        <button onClick={openCreateForm} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
        }}>
          <Plus size={18} /> NOVA PRAÇA
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Lista */}
      {squares.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <MapPin size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Nenhuma praça cadastrada</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Clique em "NOVA PRAÇA" para começar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {squares.map(sq => (
            <div key={sq.id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{sq.name}</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{sq.city} - {sq.state}</p>
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
                    background: sq.is_active ? '#dcfce7' : '#f1f5f9',
                    color: sq.is_active ? '#16a34a' : '#94a3b8'
                  }}>
                    {sq.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{sq.restaurants_count}</p>
                    <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Estabelecimentos</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{sq.drivers_count}</p>
                    <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Entregadores</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{sq.orders_count}</p>
                    <p style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Pedidos</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => openEditForm(sq)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Edit size={14} /> Editar
                </button>
                <button onClick={() => handleDelete(sq.id)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #fecaca', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{editing ? 'Editar Praça' : 'Nova Praça'}</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome da Praça *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Ex: Porto Alegre" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Cidade *</label>
                  <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} style={inputStyle} placeholder="Porto Alegre" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>UF *</label>
                  <input type="text" value={formData.state} onChange={e => setFormData(p => ({ ...p, state: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="RS" maxLength={2} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>Cancelar</button>
                <button type="submit" disabled={formLoading} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: formLoading ? 'not-allowed' : 'pointer', opacity: formLoading ? 0.7 : 1 }}>
                  {formLoading ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

export default AdminSquaresPage;
