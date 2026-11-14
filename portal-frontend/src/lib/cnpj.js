// Validação e máscara de CNPJ — compartilhada por todos os formulários
// (cadastro de estabelecimento, formulário admin, tenants, white-label).
// Regra: 14 dígitos, aceita com ou sem máscara; a coluna do banco tem 18 chars.

// Formata os dígitos enquanto o usuário digita: XX.XXX.XXX/XXXX-XX (máx. 14 dígitos)
export const formatCnpj = (digits) => {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '.' + d.slice(2, 5);
  if (d.length > 5) out += '.' + d.slice(5, 8);
  if (d.length > 8) out += '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
};

// Só os dígitos do valor exibido
export const cnpjDigits = (value) => String(value || '').replace(/\D/g, '');

// Mensagem de erro em tempo real — null quando ok (ou campo vazio = opcional).
// `overflow` = usuário colou/digitou mais de 14 dígitos (a máscara corta, mas avisamos).
export const getCnpjHint = (value, overflow = false) => {
  const digits = cnpjDigits(value);
  if (overflow) {
    return { ok: false, text: 'Quantidade de dígitos excedeu o permitido (14) — verifique o CNPJ' };
  }
  if (digits.length === 0) return null;
  if (digits.length < 14) {
    return { ok: false, text: `CNPJ deve ter 14 dígitos — faltam ${14 - digits.length}` };
  }
  return { ok: true, text: 'CNPJ completo' };
};

// true quando o valor é vazio (opcional) ou tem exatamente 14 dígitos
export const isCnpjValid = (value, overflow = false) => {
  if (overflow) return false;
  const digits = cnpjDigits(value);
  return digits.length === 0 || digits.length === 14;
};
