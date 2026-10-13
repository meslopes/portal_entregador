let confirmFn = null;

export const setConfirmFn = (fn) => {
  confirmFn = fn;
};

/**
 * Abre o ConfirmDialog visual (botão Cancelar/Confirmar).
 * Preferir confirmAsync() para fluxos com await.
 */
export const showConfirm = (message, onConfirm, title = 'Confirmação') => {
  if (confirmFn) {
    confirmFn(message, onConfirm, title);
  } else {
    // Fallback se o container não estiver montado
    if (window.confirm(message)) onConfirm();
  }
};

/**
 * Confirmação em Promise — substitui window.confirm com UI consistente.
 * Uso: if (!(await confirmAsync('Excluir?'))) return;
 */
export const confirmAsync = (message, title = 'Confirmação') => {
  return new Promise((resolve) => {
    if (!confirmFn) {
      resolve(window.confirm(message));
      return;
    }
    confirmFn(
      message,
      () => resolve(true),
      title,
      () => resolve(false)
    );
  });
};
