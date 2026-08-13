import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, RefreshCw, AlertCircle, CheckCircle, Truck, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const EstablishmentDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', vehicle_type: 'MOTO',
    vehicle_plate: '', vehicle_model: '', pin: ''
  });

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      // Buscar ID do restaurante do usuário logado
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;
      
      if (restaurantId) {
        const res = await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`);
        setDrivers(res.data.drivers || []);
      }
    } catch {
      setError('Erro ao carregar entregadores');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', vehicle_type: 'MOTO', vehicle_plate: '', vehicle_model: '', pin: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (driver) => {
    setForm({
      name: driver.name || '',
      phone: driver.phone || '',
      vehicle_type: driver.vehicle_type || 'MOTO',
      vehicle_plate: driver.vehicle_plate || '',
      vehicle_model: driver.vehicle_model || '',
      pin: ''
    });
    setEditingId(driver.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Nome é obrigatório'); return; }

    try {
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;

      const driverData = { ...form };
      delete driverData.pin; // PIN é tratado separadamente

      if (editingId) {
        await api.put(`/api/admin/establishment-drivers/${editingId}`, driverData);
        setSuccess('Entregador atualizado!');
      } else {
        await api.post('/api/admin/establishment-drivers', { ...driverData, restaurant_id: restaurantId });
        setSuccess('Entregador cadastrado!');
      }

      // Definir PIN se fornecido
      if (form.pin && form.pin.length === 4) {
        const driverId = editingId || (await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`)).data.drivers.find(d => d.phone === form.phone)?.id;
        if (driverId) {
          await api.post('/api/own-driver/register-pin', {
            phone: form.phone,
            pin: form.pin,
            restaurant_id: restaurantId
          });
        }
      }

      resetForm();
      loadDrivers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este entregador?')) return;
    try {
      await api.delete(`/api/admin/establishment-drivers/${id}`);
      loadDrivers();
    } catch {
      alert('Erro ao remover');
    }
  };

  const handleToggleOnline = async (driver) => {
    try {
      await api.put(`/api/admin/establishment-drivers/${driver.id}/toggle-online`, {
        is_online: !driver.is_online
      });
      loadDrivers();
    } catch {
      alert('Erro ao alterar status');
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'MOTO': return '🏍️';
      case 'BIKE': return '🚲';
      case 'CAR': return '🚗';
      default: return '🚗';
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
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Meus Entregadores</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie sua equipe de entregadores próprios</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadDrivers} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <Plus size={16} /> Novo Entregador
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> {success}</div>}

      {/* Modal de formulário */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={resetForm} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '500px', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Editar Entregador' : 'Novo Entregador'}</h2>
              <button onClick={resetForm} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={inputStyle} placeholder="Nome do entregador" />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Telefone</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="(51) 99999-9999" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Veículo</label>
                  <select value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))} style={inputStyle}>
                    <option value="MOTO">🏍️ Moto</option>
                    <option value="BIKE">🚲 Bicicleta</option>
                    <option value="CAR">🚗 Carro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Placa</label>
                  <input value={form.vehicle_plate} onChange={e => setForm(p => ({ ...p, vehicle_plate: e.target.value }))} style={inputStyle} placeholder="ABC-1234" />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Modelo do Veículo</label>
                <input value={form.vehicle_model} onChange={e => setForm(p => ({ ...p, vehicle_model: e.target.value }))} style={inputStyle} placeholder="Honda CG 160" />
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0f766e', marginBottom: '0.5rem' }}>
                  PIN de Acesso (PWA)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem' }}>
                  O entregador usa este PIN de 4 dígitos para acessar o app
                </p>
                <input
                  type="text"
                  value={form.pin}
                  onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  style={{ ...inputStyle, maxWidth: '150px', textAlign: 'center', letterSpacing: '0.5rem', fontFamily: 'monospace', fontSize: '1.25rem' }}
                  placeholder="0000"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={resetForm} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Save size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Lista de entregadores */}
      {drivers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Users size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhum entregador cadastrado</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>Cadastre seus entregadores para começar a usar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {drivers.map(driver => (
            <div key={driver.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${driver.is_online ? '#22c55e' : '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: driver.is_online ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    {getVehicleIcon(driver.vehicle_type)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{driver.name}</span>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: driver.is_online ? '#dcfce7' : '#f1f5f9', color: driver.is_online ? '#166534' : '#64748b' }}>
                        {driver.is_online ? 'Online' : 'Offline'}
                      </span>
                      {driver.has_pin && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                          PIN ✓
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      {driver.vehicle_type} {driver.vehicle_plate ? `• ${driver.vehicle_plate}` : ''} {driver.vehicle_model ? `• ${driver.vehicle_model}` : ''}
                    </p>
                    {driver.phone && (
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{driver.phone}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleToggleOnline(driver)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: driver.is_online ? '#22c55e' : '#e2e8f0', color: driver.is_online ? 'white' : '#64748b', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {driver.is_online ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {driver.is_online ? 'Online' : 'Offline'}
                  </button>
                  <button onClick={() => handleEdit(driver)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(driver.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.75rem' }}>
          <Truck size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Como funciona
        </h3>
        <ul style={{ fontSize: '0.8125rem', color: '#1e3a5f', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>Cadastre seus entregadores próprios aqui</li>
          <li>Quando um pedido chegar, seus entregadores serão notificados primeiro</li>
          <li>Se quiser, pode chamar os entregadores da plataforma com o botão "Chamar Plataforma"</li>
          <li>Entregas feitas pelos seus próprios entregadores não têm comissão do muv.log</li>
        </ul>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EstablishmentDriversPage;
