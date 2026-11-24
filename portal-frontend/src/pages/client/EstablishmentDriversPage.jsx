import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, RefreshCw, AlertCircle, CheckCircle, Bike, MapPin, ToggleLeft, ToggleRight, MessageCircle, Copy } from 'lucide-react';
import api from '@/lib/api';
import { maskPii } from '@/lib/utils';
import { showToast } from '@/components/Toast.utils';

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
    vehicle_plate: '', vehicle_model: '', pin: '',
    payment_frequency: 'WEEKLY'
  });
  // Estado do modal "Enviar Acesso" (entregador + PIN que sera incluido na mensagem)
  const [sendDriver, setSendDriver] = useState(null);
  const [sendPin, setSendPin] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendMode, setSendMode] = useState('pin'); // 'pin' | 'link'
  const [activationLink, setActivationLink] = useState(null); // dados do link de ativacao
  const [acertos, setAcertos] = useState([]); // acertos de retorno pendentes (A3)
  // F1 frota compartilhada — lojas atendidas além da base
  const [fleetEnabled, setFleetEnabled] = useState(false);
  const [fleetStores, setFleetStores] = useState([]); // lojas com flag para vincular
  const [expandedFleet, setExpandedFleet] = useState(null); // driver id aberto
  const [driverStores, setDriverStores] = useState({}); // driverId -> [links]

  const loadAcertos = async () => {
    try {
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;
      if (!restaurantId) return;
      const res = await api.get(`/api/admin/establishment-drivers/settlements?restaurant_id=${restaurantId}`);
      setAcertos(res.data.settlements || []);
    } catch { /* apoio — nunca derruba a página */ }
  };

  const confirmarAcerto = async (a) => {
    const ok = window.confirm(
      `Confirmar o acerto recebido de ${a.driver}?\n\n${a.itens.map(i => i.texto).join('\n')}\n\n` +
      'Ao confirmar, o entregador volta a receber ofertas.'
    );
    if (!ok) return;
    try {
      await api.post('/api/admin/establishment-drivers/settlements/confirm', { order_ids: a.order_ids });
      setSuccess('Acerto confirmado — entregador liberado');
      loadAcertos();
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao confirmar o acerto');
    }
  };

  useEffect(() => { loadDrivers(); loadAcertos(); loadFleet(); }, []);

  // F1 — carrega flag da frota + lojas vinculáveis (só se a loja tiver o produto)
  const loadFleet = async () => {
    try {
      const userRes = await api.get('/api/user/profile');
      if (!userRes.data.fleet_sharing_enabled) return;
      setFleetEnabled(true);
      const res = await api.get('/api/admin/establishment-drivers/fleet-stores');
      setFleetStores(res.data.stores || []);
    } catch { /* apoio — nunca derruba a página */ }
  };

  // Abre/fecha o bloco "Lojas atendidas" do entregador (carrega na 1ª vez)
  const toggleFleet = async (driverId) => {
    if (expandedFleet === driverId) { setExpandedFleet(null); return; }
    setExpandedFleet(driverId);
    if (!driverStores[driverId]) {
      try {
        const res = await api.get(`/api/admin/establishment-drivers/${driverId}/stores`);
        setDriverStores(prev => ({ ...prev, [driverId]: res.data.stores || [] }));
      } catch { /* apoio */ }
    }
  };

  const addFleetStore = async (driverId, restaurantId) => {
    if (!restaurantId) return;
    try {
      await api.post(`/api/admin/establishment-drivers/${driverId}/stores`, { restaurant_id: restaurantId });
      setSuccess('Loja adicionada ao roteiro do entregador');
      const res = await api.get(`/api/admin/establishment-drivers/${driverId}/stores`);
      setDriverStores(prev => ({ ...prev, [driverId]: res.data.stores || [] }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao vincular loja');
    }
  };

  const removeFleetStore = async (driverId, restaurantId) => {
    if (!window.confirm('Remover esta loja do roteiro do entregador?')) return;
    try {
      await api.delete(`/api/admin/establishment-drivers/${driverId}/stores/${restaurantId}`);
      setSuccess('Loja removida do roteiro');
      const res = await api.get(`/api/admin/establishment-drivers/${driverId}/stores`);
      setDriverStores(prev => ({ ...prev, [driverId]: res.data.stores || [] }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover vínculo');
    }
  };

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
      pin: '',
      payment_frequency: driver.payment_frequency || 'WEEKLY'
    });
    setEditingId(driver.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Nome é obrigatório'); return; }
    if (!form.phone || !form.phone.replace(/\D/g, '')) { setError('Telefone é obrigatório (login do entregador)'); return; }

    try {
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;

      const driverData = { ...form };
      delete driverData.pin; // PIN é tratado separadamente

      let createdDriver = null;
      if (editingId) {
        await api.put(`/api/admin/establishment-drivers/${editingId}`, driverData);
        setSuccess('Entregador atualizado!');
      } else {
        const createRes = await api.post('/api/admin/establishment-drivers', { ...driverData, restaurant_id: restaurantId });
        createdDriver = createRes.data.driver;
        setSuccess('Entregador cadastrado!');
      }

      // Definir PIN se fornecido (não bloqueia o cadastro se falhar)
      if (form.pin && form.pin.length === 4 && form.phone) {
        try {
          await api.post('/api/own-driver/register-pin', {
            phone: form.phone,
            pin: form.pin,
            restaurant_id: restaurantId
          });
          setSuccess(prev => prev + ' PIN definido com sucesso!');
        } catch (pinErr) {
          console.error('Erro ao definir PIN:', pinErr);
          setSuccess(prev => prev + ' Atenção: PIN não foi definido - ' + (pinErr.response?.data?.error || 'erro desconhecido'));
        }
      }

      // PIN digitado no form precisa ser capturado antes do resetForm limpar o estado
      const pinDoForm = form.pin || '';
      resetForm();
      loadDrivers();
      setTimeout(() => setSuccess(''), 5000);

      // Fluxo cadastrar -> enviar: abre o modal "Enviar Acesso" ja com o PIN digitado,
      // para mandar o link do app ao entregador recem-cadastrado
      if (createdDriver) {
        openSendModal(createdDriver, pinDoForm);
      }
    } catch (err) {
      // 409 = telefone já existe — mostra a oferta de vínculo (frota compartilhada)
      const d = err.response?.data || {};
      setError([d.error, d.link_suggestion].filter(Boolean).join(' — ') || 'Erro ao salvar');
    }
  };

  // ===== ENVIAR ACESSO =====
  // Ferramenta para o estabelecimento mandar ao entregador o link do app,
  // o telefone (login) e o PIN — tudo em uma unica mensagem.

  /** Abre o modal de envio de acesso. pinFromForm = PIN recem-digitado no cadastro. */
  const openSendModal = (driver, pinFromForm = '') => {
    setSendDriver(driver);
    setSendPin(pinFromForm || '');
    setSendError('');
    setSendMode('pin');
    setActivationLink(null);
  };

  /** Fecha o modal sem enviar. */
  const closeSendModal = () => {
    setSendDriver(null);
    setSendPin('');
    setSendError('');
  };

  /** Monta a mensagem pronta com link do app, telefone (login) e PIN. */
  const buildAccessMessage = (driver, pin) => {
    const origin = window.location.origin;
    const phone = driver.phone || '';
    const linhas = [
      'Olá, ' + driver.name + '! Seu acesso ao app do muv.log está pronto.',
      '',
      'Link do app: ' + origin + '/own-driver/login',
      'Login: seu telefone (' + phone + ')',
    ];
    if (pin) {
      linhas.push('PIN: ' + pin);
      linhas.push('');
      linhas.push('Abra o link no celular e faça o login. Recomendamos adicionar o app à tela inicial.');
    } else {
      linhas.push('');
      linhas.push('Abra o link no celular e faça o login com o PIN combinado. Recomendamos adicionar o app à tela inicial.');
    }
    return linhas.join('\n');
  };

  /** Monta a mensagem do link de ativação (o entregador define o próprio PIN). */
  const buildLinkMessage = (driver) => {
    const url = window.location.origin + (activationLink?.activation_path || '');
    return [
      'Olá, ' + driver.name + '! Seu acesso ao app do muv.log está pronto.',
      '',
      'Use este link para definir seu PIN e entrar:',
      url,
      '',
      'Guarde o PIN que você escolher — é com ele que você entra no app.',
    ].join('\n');
  };

  /** Gera o link de ativação (uso único, expira em 7 dias). */
  const handleGenerateLink = async () => {
    if (!sendDriver) return;
    try {
      setSendError('');
      const res = await api.post('/api/admin/establishment-drivers/' + sendDriver.id + '/activation-link');
      setActivationLink(res.data);
    } catch (err) {
      setSendError(err.response?.data?.error || 'Erro ao gerar o link de ativação');
    }
  };

  /** Envia a mensagem com o link de ativação (WhatsApp ou cópia). */
  const handleSendLink = (channel) => {
    if (!sendDriver || !activationLink) return;
    const mensagem = buildLinkMessage(sendDriver);
    const telefone = (sendDriver.phone || '').replace(/\D/g, '');
    if (channel === 'whatsapp') {
      window.open('https://wa.me/55' + telefone + '?text=' + encodeURIComponent(mensagem), '_blank');
    } else {
      navigator.clipboard.writeText(mensagem).then(() => {
        showToast('Link copiado! Envie ao entregador.', 'success');
      }).catch(() => showToast('Erro ao copiar', 'error'));
    }
    closeSendModal();
    loadDrivers();
  };

  /**
   * Envia o acesso ao entregador: valida e grava o PIN (se informado),
   * monta a mensagem e abre o WhatsApp ou copia para a area de transferencia.
   */
  const handleSendAccess = async (channel) => {
    if (!sendDriver) return;
    const pin = (sendPin || '').trim();

    // Sem PIN o entregador nao entra no app — exigir definicao antes de enviar
    if (!sendDriver.has_pin && pin.length !== 4) {
      setSendError('Defina o PIN — sem PIN o entregador não consegue entrar no app.');
      return;
    }
    if (pin && pin.length !== 4) {
      setSendError('PIN deve ter 4 dígitos numéricos');
      return;
    }

    // Grava o PIN antes de montar a mensagem. O banco guarda apenas o hash;
    // o valor aparece na mensagem somente no momento do envio.
    if (pin) {
      try {
        await api.post('/api/admin/establishment-drivers/' + sendDriver.id + '/pin', { pin });
      } catch (err) {
        setSendError(err.response?.data?.error || 'Erro ao definir PIN');
        return;
      }
    }

    const mensagem = buildAccessMessage(sendDriver, pin);
    const telefone = (sendDriver.phone || '').replace(/\D/g, '');

    if (channel === 'whatsapp') {
      // Mesmo padrao do pedido (OrderInfoSection): wa.me com texto pre-preenchido
      window.open('https://wa.me/55' + telefone + '?text=' + encodeURIComponent(mensagem), '_blank');
    } else {
      try {
        await navigator.clipboard.writeText(mensagem);
        showToast('Mensagem copiada! Envie ao entregador.', 'success');
      } catch {
        showToast('Erro ao copiar mensagem', 'error');
      }
    }

    closeSendModal();
    loadDrivers(); // atualiza os selos de PIN apos gravar
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este entregador?')) return;
    try {
      await api.delete(`/api/admin/establishment-drivers/${id}`);
      loadDrivers();
    } catch {
      showToast('Erro ao remover', 'error');
    }
  };

  const handleToggleOnline = async (driver) => {
    try {
      await api.put(`/api/admin/establishment-drivers/${driver.id}/toggle-online`, {
        is_online: !driver.is_online
      });
      loadDrivers();
    } catch {
      showToast('Erro ao alterar status', 'error');
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

      {/* Acertos de retorno pendentes (dinheiro/maquininha/PIX) — travam novas ofertas */}
      {acertos.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.5rem' }}>
            ⏳ Acertos de retorno pendentes — estes entregadores NÃO recebem novas ofertas até o acerto
          </p>
          {acertos.map(a => (
            <div key={a.driver_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderTop: '1px solid #fed7aa', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#7c2d12' }}>{a.driver}</p>
                <p style={{ fontSize: '0.75rem', color: '#9a3412' }}>{a.itens.map(i => i.texto).join(' · ')}</p>
              </div>
              <button
                onClick={() => confirmarAcerto(a)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                  background: '#ea580c', color: 'white', fontWeight: 600,
                  fontSize: '0.8125rem', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Confirmar acerto recebido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={resetForm} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '500px', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Editar Entregador' : 'Novo Entregador'}</h2>
              <button onClick={resetForm} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Frequência de Pagamento</label>
                <select value={form.payment_frequency} onChange={e => setForm(p => ({ ...p, payment_frequency: e.target.value }))} style={inputStyle}>
                  <option value="DAILY">📅 Diário</option>
                  <option value="WEEKLY">📆 Semanal</option>
                  <option value="MONTHLY">🗓️ Mensal</option>
                  <option value="ON_DEMAND">⚡ Sob Demanda</option>
                </select>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {form.payment_frequency === 'DAILY' && 'Pagamento realizado todo dia'}
                  {form.payment_frequency === 'WEEKLY' && 'Pagamento realizado toda semana'}
                  {form.payment_frequency === 'MONTHLY' && 'Pagamento realizado todo mês'}
                  {form.payment_frequency === 'ON_DEMAND' && 'Pagamento sob demanda (ocasional, finais de semana, alta demanda)'}
                </p>
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

      {/* Modal Enviar Acesso — manda link do app + login (telefone) + PIN ao entregador */}
      {sendDriver && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={closeSendModal} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '520px', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Enviar Acesso</h2>
              <button onClick={closeSendModal} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>
                <strong>{sendDriver.name}</strong>
                {sendDriver.phone ? ' · ' + sendDriver.phone : ''}
              </p>

              {/* Escolha do modo de envio (Opção 1 = PIN na mensagem / Opção 2 = link de ativação) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                {[['pin', 'Com PIN'], ['link', 'Link de ativação']].map(([modo, rotulo]) => (
                  <button key={modo} type="button" onClick={() => { setSendMode(modo); setSendError(''); }}
                    style={{
                      padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                      border: `1.5px solid ${sendMode === modo ? '#0d9488' : '#e2e8f0'}`,
                      background: sendMode === modo ? '#0d9488' : 'white',
                      color: sendMode === modo ? 'white' : '#475569'
                    }}>
                    {rotulo}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                {sendMode === 'pin'
                  ? 'A mensagem vai com o PIN que você definir abaixo.'
                  : 'O entregador abre o link e define o PRÓPRIO PIN — nenhum segredo na mensagem.'}
              </p>

              {sendMode === 'pin' && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0f766e', marginBottom: '0.5rem' }}>
                    PIN que será enviado (4 dígitos)
                  </label>
                  <input
                    type="text"
                    value={sendPin}
                    onChange={e => { setSendPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setSendError(''); }}
                    style={{ ...inputStyle, maxWidth: '150px', textAlign: 'center', letterSpacing: '0.5rem', fontFamily: 'monospace', fontSize: '1.25rem' }}
                    placeholder="0000"
                    maxLength={4}
                    inputMode="numeric"
                  />
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.6 }}>
                    {sendDriver.has_pin
                      ? 'O PIN atual não pode ser recuperado. Digite um novo para incluir na mensagem (será redefinido), ou deixe em branco se o entregador já sabe o PIN.'
                      : 'Sem PIN o entregador não consegue entrar no app. Defina o PIN que será enviado.'}
                  </p>
                </div>
              )}

              {sendMode === 'link' && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
                  {!activationLink ? (
                    <>
                      <p style={{ fontSize: '0.8125rem', color: '#0f766e', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                        O link é de uso único e expira em 7 dias. Serve também para o entregador
                        redefinir o PIN caso esqueça — é só gerar um link novo.
                      </p>
                      <button type="button" onClick={handleGenerateLink}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                        Gerar link de ativação
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                        Link gerado (uso único, expira em 7 dias):
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#0f766e', fontFamily: 'monospace', wordBreak: 'break-all', background: 'white', border: '1px solid #99f6e4', borderRadius: '0.375rem', padding: '0.5rem' }}>
                        {window.location.origin + activationLink.activation_path}
                      </p>
                    </>
                  )}
                </div>
              )}

              {sendError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={15} /> {sendError}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Mensagem que será enviada
              </label>
              <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.8125rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0, marginBottom: '1.25rem' }}>
                {sendMode === 'pin'
                  ? buildAccessMessage(sendDriver, sendPin.trim())
                  : (activationLink ? buildLinkMessage(sendDriver) : 'Gere o link de ativação para ver a mensagem.')}
              </pre>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeSendModal} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="button" disabled={sendMode === 'link' && !activationLink}
                  onClick={() => sendMode === 'pin' ? handleSendAccess('copy') : handleSendLink('copy')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: (sendMode === 'link' && !activationLink) ? 'not-allowed' : 'pointer', opacity: (sendMode === 'link' && !activationLink) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Copy size={14} /> Copiar
                </button>
                <button type="button" disabled={sendMode === 'link' && !activationLink}
                  onClick={() => sendMode === 'pin' ? handleSendAccess('whatsapp') : handleSendLink('whatsapp')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#25d366', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: (sendMode === 'link' && !activationLink) ? 'not-allowed' : 'pointer', opacity: (sendMode === 'link' && !activationLink) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lista de entregadores */}
      {drivers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Users size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhum entregador cadastrado</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Cadastre seus entregadores para começar a usar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {drivers.map(driver => (
            <div key={driver.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${driver.is_online ? '#22c55e' : '#64748b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: driver.is_online ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    {getVehicleIcon(driver.vehicle_type)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{driver.name}</span>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: driver.is_online ? '#dcfce7' : '#f1f5f9', color: driver.is_online ? '#166534' : '#64748b' }}>
                        {driver.is_online ? 'Online' : 'Offline'}
                      </span>
                      {driver.has_pin ? (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                          PIN ✓
                        </span>
                      ) : (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                          Sem PIN — acesso bloqueado
                        </span>
                      )}
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                        Próprio
                      </span>
                      {driver.payment_frequency && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#ede9fe', color: '#6d28d9' }}>
                          {driver.payment_frequency === 'DAILY' ? '📅 Diário' :
                           driver.payment_frequency === 'WEEKLY' ? '📆 Semanal' :
                           driver.payment_frequency === 'MONTHLY' ? '🗓️ Mensal' :
                           driver.payment_frequency === 'ON_DEMAND' ? '⚡ Sob Demanda' :
                           driver.payment_frequency}
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      {driver.vehicle_type} {driver.vehicle_plate ? `• ${driver.vehicle_plate}` : ''} {driver.vehicle_model ? `• ${driver.vehicle_model}` : ''}
                    </p>
                    {driver.phone && (
                      <p style={{ color: '#64748b', fontSize: '0.75rem' }}>{maskPii(driver.phone, 'phone')}</p>
                    )}
                    {driver.square_name && (
                      <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        Praça: {driver.square_name} {driver.square_city ? `- ${driver.square_city}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openSendModal(driver)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#25d366', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <MessageCircle size={14} /> Enviar Acesso
                  </button>
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

              {/* F1 — Lojas atendidas (frota compartilhada). Só aparece se o
                  produto estiver habilitado — nada de poluir quem não usa. */}
              {fleetEnabled && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button onClick={() => toggleFleet(driver.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    <MapPin size={13} />
                    Lojas atendidas ({(driverStores[driver.id] || []).length + 1})
                    {expandedFleet === driver.id ? ' ▲' : ' ▼'}
                  </button>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                    A base ({driver.restaurant_name || 'sua loja'}) sempre conta + lojas vinculadas
                  </p>
                  {expandedFleet === driver.id && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      {(driverStores[driver.id] || []).length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                          Nenhuma loja extra — este entregador atende só a base.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                          {(driverStores[driver.id] || []).map(l => (
                            <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1875rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
                              {l.restaurant_name}
                              <button onClick={() => removeFleetStore(driver.id, l.restaurant_id)}
                                title="Remover vínculo"
                                style={{ border: 'none', background: 'transparent', color: '#166534', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {fleetStores.length > 0 && (
                        <select defaultValue="" onChange={e => { addFleetStore(driver.id, e.target.value); e.target.value = ''; }}
                          style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.75rem', background: 'white' }}>
                          <option value="">+ Vincular outra loja…</option>
                          {fleetStores
                            .filter(s => !(driverStores[driver.id] || []).some(l => l.restaurant_id === s.id))
                            .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                      {fleetStores.length === 0 && (
                        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
                          Nenhuma outra loja com frota compartilhada ligada nesta organização.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#eff6ff', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.75rem' }}>
          <Bike size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Como funciona
        </h3>
        <ul style={{ fontSize: '0.8125rem', color: '#1e3a5f', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>Cadastre seus entregadores próprios aqui</li>
          <li>Use "Enviar Acesso" para mandar ao entregador o link do app, o telefone (login) e o PIN — tudo em uma mensagem</li>
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
