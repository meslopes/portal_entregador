let confirmFn = null;

export const setConfirmFn = (fn) => {
  confirmFn = fn;
};

export const showConfirm = (message, onConfirm, title = 'Confirmação') => {
  if (confirmFn) {
    confirmFn(message, onConfirm, title);
  }
};
