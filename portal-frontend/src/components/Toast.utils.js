let addToastFn = null;

export const setAddToastFn = (fn) => {
  addToastFn = fn;
};

export const showToast = (message, type = 'info', duration = 4000) => {
  if (addToastFn) {
    addToastFn(message, type, duration);
  }
};
