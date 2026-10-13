/**
 * Configuração do Firebase - muv.log
 * Push notifications via Firebase Cloud Messaging (FCM)
 *
 * As chaves vêm de variáveis de ambiente (VITE_FIREBASE_*) para não
 * ficarem no repositório. Configure em .env.local e no Vercel.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'muv-log.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'muv-log',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'muv-log.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '517350557310',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Sem config válida, FCM fica desabilitado (fail closed)
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && vapidKey);
if (!isConfigured) {
  console.warn('[Firebase] Config ausente (VITE_FIREBASE_*) — push notifications desabilitadas');
}

const app = isConfigured ? initializeApp(firebaseConfig) : null;

// Inicializar FCM
let messaging = null;
if (isConfigured) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('[Firebase] Messaging não suportado neste navegador:', err.message);
  }
}

/**
 * Solicitar permissão e obter token FCM
 * Retorna o token ou null se o usuário negar
 */
export async function requestNotificationPermission() {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase] Permissão de notificação negada');
      return null;
    }

    // Obter token FCM
    const token = await getToken(messaging, { vapidKey });

    if (token) {
      if (import.meta.env.DEV) console.log('[Firebase] Token FCM obtido');
      return token;
    }

    console.log('[Firebase] Nenhum token disponível');
    return null;
  } catch (err) {
    console.error('[Firebase] Erro ao obter token:', err);
    return null;
  }
}

/**
 * Escutar mensagens quando o app está em foreground
 */
export function onForegroundMessage(callback) {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    if (import.meta.env.DEV) console.log('[Firebase] Mensagem recebida em foreground:', payload);
    if (callback) callback(payload);
  });
}

export { messaging };
