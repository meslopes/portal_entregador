import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Reduz o objeto de usuário ao mínimo necessário para o localStorage.
 * NUNCA persistir CPF, telefone, senha ou outros dados sensíveis (LGPD).
 * O objeto completo fica só em memória (AuthContext), vindo de getProfile().
 */
export function sanitizeUserForStorage(user) {
  if (!user) return null;
  return {
    id: user.id,
    user_type: user.user_type,
    is_super_admin: user.is_super_admin || false,
    tenant_id: user.tenant_id ?? null,
    status: user.status,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    // Só o essencial do driver (GPS/status) — sem telefone/CPF
    driver: user.driver
      ? { id: user.driver.id, is_online: user.driver.is_online }
      : null,
  };
}

/**
 * Gera senha forte aleatória para criação de usuários.
 * Evita senhas padrão previsíveis (admin123, 123456).
 */
export function generateStrongPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I/O para evitar confusão
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  // Garante ao menos 1 de cada classe
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = pwd.length; i < length; i++) pwd += pick(all);
  // Embaralha
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Confirmação forte para ações destrutivas: exige digitar uma frase.
 * Substitui window.confirm simples (que é trivialmente burlável).
 */
export function confirmDestructive(phrase, message) {
  const typed = window.prompt(`${message}\n\nDigite "${phrase}" para confirmar:`);
  return typed === phrase;
}

/**
 * Mascara PII para export/backup: CPF e telefone nunca vão completos.
 */
export function maskPii(value, type = 'phone') {
  if (!value) return value;
  const digits = String(value).replace(/\D/g, '');
  if (type === 'cpf' && digits.length === 11) {
    return `***.${digits.slice(3, 6)}.***-${digits.slice(9)}`;
  }
  if (type === 'phone' && digits.length >= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}****-${digits.slice(-4)}`;
  }
  return '***';
}

/**
 * Prepara dados para export de backup ofuscando PII.
 */
export function sanitizeBackupData(data) {
  const maskUser = (u) => ({
    ...u,
    cpf: maskPii(u.cpf, 'cpf'),
    phone: maskPii(u.phone, 'phone'),
  });
  return {
    ...data,
    users: (data.users || []).map(maskUser),
    platform_drivers: (data.platform_drivers || []).map(maskUser),
    own_drivers: (data.own_drivers || []).map(maskUser),
  };
}
