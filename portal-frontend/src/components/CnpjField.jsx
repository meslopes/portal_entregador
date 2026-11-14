import React, { useState } from 'react';
import { formatCnpj, getCnpjHint } from '@/lib/cnpj';

/**
 * Campo de CNPJ com máscara e validação em tempo real (14 dígitos).
 * Mostra aviso abaixo do campo enquanto o usuário digita ("faltam N dígitos",
 * "excedeu — verifique"). onChange recebe o valor já formatado.
 */
const CnpjField = ({ value, onChange, name = 'cnpj', placeholder = '00.000.000/0001-00', style }) => {
  // Aviso quando o usuário cola/digita mais de 14 dígitos (a máscara corta, mas avisamos)
  const [overflow, setOverflow] = useState(false);
  const hint = getCnpjHint(value, overflow);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setOverflow(raw.length > 14);
    onChange(formatCnpj(raw));
  };

  return (
    <div>
      <input
        type="text"
        name={name}
        inputMode="numeric"
        maxLength={18}
        value={value || ''}
        onChange={handleChange}
        style={{ ...style, ...(hint ? { borderColor: hint.ok ? '#22c55e' : '#ef4444' } : {}) }}
        placeholder={placeholder}
      />
      {hint && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0, color: hint.ok ? '#16a34a' : '#dc2626' }}>
          {hint.ok ? '✓' : '⚠'} {hint.text}
        </p>
      )}
    </div>
  );
};

export default CnpjField;
