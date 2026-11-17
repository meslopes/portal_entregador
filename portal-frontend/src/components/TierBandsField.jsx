import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Editor de faixas de km (modo TIERS — sem volta).
 * Valor: lista de objetos {to_km, price} com strings no formato livre;
 * o pai normaliza para número/null ao salvar. "Até X km — R$ Y";
 * linha com limite vazio = faixa aberta ("a partir de X").
 */
const TierBandsField = ({ value, onChange }) => {
  const bands = value && value.length ? value : [{ to_km: '', price: '' }];

  const update = (i, campo, v) => {
    onChange(bands.map((b, idx) => (idx === i ? { ...b, [campo]: v } : b)));
  };
  const addRow = () => onChange([...bands, { to_km: '', price: '' }]);
  const removeRow = (i) => onChange(bands.filter((_, idx) => idx !== i));

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.625rem', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div>
      {bands.map((b, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.25rem', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div>
            {i === 0 && <p style={{ fontSize: '0.6875rem', color: '#64748b', margin: '0 0 0.25rem' }}>Até (km)</p>}
            <input type="number" step="0.5" min="0" value={b.to_km ?? ''} style={inputStyle}
              placeholder={i === bands.length - 1 ? 'vazio = a partir de...' : 'ex.: 3'}
              onChange={e => update(i, 'to_km', e.target.value)} />
          </div>
          <div>
            {i === 0 && <p style={{ fontSize: '0.6875rem', color: '#64748b', margin: '0 0 0.25rem' }}>Preço (R$)</p>}
            <input type="number" step="0.01" min="0" value={b.price ?? ''} style={inputStyle}
              placeholder="ex.: 8.00"
              onChange={e => update(i, 'price', e.target.value)} />
          </div>
          <button type="button" onClick={() => removeRow(i)} disabled={bands.length === 1}
            style={{ border: 'none', background: 'transparent', cursor: bands.length === 1 ? 'not-allowed' : 'pointer', color: '#dc2626', marginTop: i === 0 ? '1.15rem' : 0 }}
            title="Remover faixa">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', border: 'none', background: 'transparent', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
        <Plus size={13} /> Adicionar faixa
      </button>
    </div>
  );
};

export default TierBandsField;
