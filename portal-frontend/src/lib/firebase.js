/**
 * Configuração do Firebase - muv.log
 * Push notifications via Firebase Cloud Messaging (FCM)
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCaPgR3xg-Fkeu3go9W4tOsb2Y3MBYYq5A",
  authDomain: "muv-log.firebaseapp.com",
  projectId: "muv-log",
  storageBucket: "muv-log.firebasestorage.app",
  messagingSenderId: "517350557310",
  appId: "1:517350557310:web:717c9f2598fcb2f98d3a2f"
};

const app = initializeApp(firebaseConfig);

// Inicializar FCM
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn('[Firebase] Messaging não suportado neste navegador:', err.message);
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
    const token = await getToken(messaging, {
      vapidKey: 'BCHGx1b2v3c4d5e6f7g8h9i0j' // Será configurado depois
    });

    if (token) {
      console.log('[Firebase] Token FCM obtido:', token.substring(0, 20) + '...');
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
    console.log('[Firebase] Mensagem recebida em foreground:', payload);
    if (callback) callback(payload);
  });
}

export { messaging };
