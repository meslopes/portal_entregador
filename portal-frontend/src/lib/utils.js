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
