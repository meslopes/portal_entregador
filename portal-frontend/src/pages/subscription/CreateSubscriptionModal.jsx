import React, { useState } from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  background: 'white',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  overflow: 'auto',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem',
};

const hintStyle = {
  fontSize: '0.6875rem',
  color: '#94a3b8',
  marginTop: '0.25rem',
};

/** Editor de faixas marginais — cada faixa cobra só os pedidos que entram nela
 *  (como conta de luz). Última faixa com "Até" vazio = faixa aberta. */
const TiersEditor = ({ tiers, setTiers }) => {
  const addTier = () => setTiers([...tiers, { to_orders: '', price: '' }]);
  const removeTier = (i) => setTiers(tiers.filter((_, idx) => idx !== i));
  const updateTier = (i, field, val) => {
    const next = [...tiers];
    next[i] = { ...next[i], [field]: val };
    setTiers(next);
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {tiers.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="number" min="0" placeholder="Até N pedidos (vazio = sem limite)"
              value={t.to_orders ?? ''}
              onChange={(e) => updateTier(i, 'to_orders', e.target.value)}
              style={{ ...inputStyle, padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number" step="0.01" min="0" placeholder="R$ por pedido"
              value={t.price ?? ''}
              onChange={(e) => updateTier(i, 'price', e.target.value)}
              style={{ ...inputStyle, padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}
            />
          </div>
          <button type="button" onClick={() => removeTier(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1.125rem', padding: '0.25rem' }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={addTier}
        style={{
          padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1.5px dashed #d1d5db',
          background: 'none', color: '#6b7280', fontSize: '0.75rem', cursor: 'pointer'
        }}>
        + Adicionar faixa
      </button>
      <p style={hintStyle}>
        Cada faixa cobra só os pedidos que entram nela (como conta de luz).
        Ex: até 200 = R$ 0 (grátis) · até 500 = R$ 0,80 · sem limite = R$ 0,60.
        Última faixa com "Até" vazio = cobre todo o resto.
      </p>
    </div>
  );
};

const CreateSubscriptionModal = ({
  isOpen,
  isEditing = false,
  onClose,
  onSubmit,
  createForm,
  setCreateForm,
  restaurants,
}) => {
  const [showTiers, setShowTiers] = useState(false);

  if (!isOpen) return null;

  const tiers = createForm.order_price_tiers || [];
  const setTiers = (val) => setCreateForm({ ...createForm, order_price_tiers: val });

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            {isEditing ? 'Editar Assinatura' : 'Nova Assinatura'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Estabelecimento */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Estabelecimento *</label>
            <select
              value={createForm.restaurant_id}
              onChange={(e) => setCreateForm({ ...createForm, restaurant_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Ciclo de Cobrança</label>
            <select
              value={createForm.billing_cycle}
              onChange={(e) => setCreateForm({ ...createForm, billing_cycle: e.target.value })}
              style={inputStyle}
            >
              <option value="WEEKLY">📆 Semanal</option>
              <option value="MONTHLY">🗓️ Mensal</option>
            </select>
          </div>

          {/* Modo de contagem de entregadores */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Contagem de Entregadores</label>
            <select
              value={createForm.establishment_count_mode || 'SNAPSHOT'}
              onChange={(e) => setCreateForm({ ...createForm, establishment_count_mode: e.target.value })}
              style={inputStyle}
            >
              <option value="SNAPSHOT">Ativos agora (padrão)</option>
              <option value="USO">Só quem entregou (uso)</option>
              <option value="PRO_RATA_USO">Proporcional ao uso</option>
            </select>
            {createForm.establishment_count_mode === 'USO' && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="number" min="1" placeholder="Mín. pedidos entregues para contar"
                  value={createForm.min_orders_per_establishment || ''}
                  onChange={(e) => setCreateForm({ ...createForm, min_orders_per_establishment: parseInt(e.target.value) || 0 })}
                  style={{ ...inputStyle, fontSize: '0.8125rem' }}
                />
                <p style={hintStyle}>Entregador só é cobrado se fez pelo menos N pedidos no ciclo</p>
              </div>
            )}
          </div>

          {/* Preço por entregador */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Preço por Entregador (R$)</label>
            <input
              type="number" step="0.01"
              value={createForm.price_per_driver}
              onChange={(e) => setCreateForm({ ...createForm, price_per_driver: parseFloat(e.target.value) })}
              style={inputStyle}
            />
          </div>

          {/* Preço fixo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Preço Fixo por Ciclo (R$ <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>opcional</span>)
            </label>
            <input
              type="number" step="0.01"
              value={createForm.fixed_price}
              onChange={(e) => setCreateForm({ ...createForm, fixed_price: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
            />
            <p style={hintStyle}>Valor fixo cobrado por ciclo, independente de entregadores/pedidos</p>
          </div>

          {/* Cobrança por pedido — simples ou faixas */}
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              Cobrança por Pedido
            </p>

            {/* Modo simples */}
            {!showTiers && tiers.length === 0 && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>Preço por Pedido (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={createForm.price_per_order ?? 0}
                    onChange={(e) => setCreateForm({ ...createForm, price_per_order: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cota de Pedidos Inclusos</label>
                  <input
                    type="number" min="0"
                    value={createForm.orders_included || ''}
                    onChange={(e) => setCreateForm({ ...createForm, orders_included: parseInt(e.target.value) || 0 })}
                    placeholder="0 = sem cota"
                    style={inputStyle}
                  />
                  <p style={hintStyle}>Pedidos dentro da cota são grátis (0 = cobrar todos)</p>
                </div>
              </>
            )}

            {/* Modo faixas marginais */}
            {(showTiers || tiers.length > 0) && (
              <TiersEditor tiers={tiers} setTiers={setTiers} />
            )}

            {/* Alternar modo */}
            <button
              type="button"
              onClick={() => {
                if (showTiers || tiers.length > 0) {
                  setShowTiers(false);
                  setTiers([]);
                } else {
                  setShowTiers(true);
                }
              }}
              style={{
                marginTop: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                border: 'none', background: 'none', color: '#2563eb',
                fontSize: '0.6875rem', cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              {(showTiers || tiers.length > 0)
                ? '← Voltar para preço simples (R$/pedido + cota)'
                : 'Usar faixas marginais (como conta de luz)'}
            </button>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                border: '1.5px solid #e2e8f0', background: 'white',
                color: '#374151', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                border: 'none', background: '#2563eb', color: 'white',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubscriptionModal;
