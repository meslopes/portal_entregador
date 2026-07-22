// ============================================
// SISTEMA DE NOTIFICACAO COMPARTILHADO
// Sirene + Notificacao do Navegador
// ============================================

let sirenInterval = null;
let sirenOscillators = [];
let audioContext = null;

// --- SIRENE (Web Audio API) ---

export const stopSiren = () => {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  sirenOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  sirenOscillators = [];
};

export const startSiren = () => {
  stopSiren();

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();

    const playCycle = () => {
      try {
        if (!audioContext || audioContext.state === 'closed') {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') audioContext.resume();

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Tom agudo (800Hz) - onda quadrada para som mais forte
        const oscHigh = ctx.createOscillator();
        const gainHigh = ctx.createGain();
        oscHigh.connect(gainHigh);
        gainHigh.connect(ctx.destination);
        oscHigh.frequency.value = 800;
        oscHigh.type = 'square';
        gainHigh.gain.setValueAtTime(0.5, now);
        gainHigh.gain.exponentialRampToValueAtTime(0.5, now + 0.15);
        gainHigh.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscHigh.start(now);
        oscHigh.stop(now + 0.25);
        sirenOscillators.push(oscHigh);

        // Tom baixo (600Hz)
        const oscLow = ctx.createOscillator();
        const gainLow = ctx.createGain();
        oscLow.connect(gainLow);
        gainLow.connect(ctx.destination);
        oscLow.frequency.value = 600;
        oscLow.type = 'square';
        gainLow.gain.setValueAtTime(0.01, now + 0.25);
        gainLow.gain.exponentialRampToValueAtTime(0.5, now + 0.3);
        gainLow.gain.exponentialRampToValueAtTime(0.5, now + 0.45);
        gainLow.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscLow.start(now + 0.25);
        oscLow.stop(now + 0.5);
        sirenOscillators.push(oscLow);
      } catch (e) {
        console.error('Erro no ciclo da sirene:', e);
      }
    };

    playCycle();
    sirenInterval = setInterval(playCycle, 500);
  } catch (e) {
    console.error('Erro ao iniciar sirene:', e);
  }
};

// --- NOTIFICACAO DO NAVEGADOR ---

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

export const sendBrowserNotification = (title, body, orderId) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/logo-muvy.jpg',
      badge: '/logo-muvy.jpg',
      tag: `order-${orderId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/orders';
      notification.close();
    };

    // Fecha automaticamente apos 30 segundos
    setTimeout(() => notification.close(), 30000);
  } catch (e) {
    console.error('Erro ao enviar notificacao:', e);
  }
};

// --- MONITOR DE PEDIDOS (para qualquer pagina) ---

let orderPollInterval = null;
let previousOrderCount = 0;
let soundEnabled = true;

export const setSoundEnabled = (enabled) => {
  soundEnabled = enabled;
  if (!enabled) stopSiren();
};

export const getSoundEnabled = () => soundEnabled;

export const startOrderMonitor = (onNewOrders) => {
  stopOrderMonitor();

  const checkOrders = async () => {
    try {
      if (!soundEnabled) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';
      const response = await fetch(`${API_URL}/api/orders/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return;

      const data = await response.json();
      const currentCount = data.orders?.length || 0;

      // Novos pedidos apareceram
      if (currentCount > previousOrderCount && previousOrderCount >= 0) {
        // Toca sirene
        if (soundEnabled) startSiren();

        // Envia notificacao do navegador
        sendBrowserNotification(
          '🔔 Novo pedido disponível!',
          `Há ${currentCount} pedido${currentCount > 1 ? 's' : ''} aguardando. Toque para aceitar.`,
          data.orders?.[0]?.id
        );

        // Callback para a pagina
        if (onNewOrders) onNewOrders(data.orders);
      }

      // Sem pedidos - para sirene
      if (currentCount === 0) {
        stopSiren();
      }

      previousOrderCount = currentCount;
    } catch (e) {
      // Silencioso - nao perturbar o usuario
    }
  };

  // Verifica imediatamente
  checkOrders();

  // Polling a cada 10 segundos
  orderPollInterval = setInterval(checkOrders, 10000);
};

export const stopOrderMonitor = () => {
  if (orderPollInterval) {
    clearInterval(orderPollInterval);
    orderPollInterval = null;
  }
  previousOrderCount = 0;
};

// Inicializa permissao de notificacao
export const initNotifications = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    // Nao pede automaticamente - espera interacao do usuario
  }
};
