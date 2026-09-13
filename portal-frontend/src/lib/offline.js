/**
 * Sistema Offline - muv.log
 *
 * Gerencia dados offline usando IndexedDB.
 * Quando o entregador perde internet, as ações são salvas localmente.
 * Quando a internet volta, a fila é enviada automaticamente.
 *
 * Uso:
 *   import { offlineDB, syncQueue, isOnline } from '@/lib/offline';
 *
 *   // Salvar uma ação offline
 *   await offlineDB.addToQueue({ type: 'ACCEPT_ORDER', orderId: 123 });
 *
 *   // Verificar se está online
 *   if (isOnline()) { ... }
 *
 *   // Sincronizar fila manualmente
 *   await syncQueue();
 */

const DB_NAME = 'muvlog-offline';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

// Abrir/criar o banco IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Operações do banco offline
export const offlineDB = {
  // Adicionar ação à fila de sincronização
  async addToQueue(action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const item = {
        ...action,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      };
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Buscar todas as ações pendentes
  async getPending() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.filter(r => r.status === 'pending'));
      request.onerror = () => reject(request.error);
    });
  },

  // Marcar ação como sincronizada
  async markSynced(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = 'synced';
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Limpar ações sincronizadas (manter apenas pendentes)
  async clearSynced() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        request.result.forEach(item => {
          if (item.status === 'synced') store.delete(item.id);
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
};

// Verificar se está online
export function isOnline() {
  return navigator.onLine;
}

// Registrar listeners de conexão
let onOnlineCallback = null;

export function onConnectionRestored(callback) {
  onOnlineCallback = callback;
  window.addEventListener('online', () => {
    if (onOnlineCallback) onOnlineCallback();
  });
}

// Sincronizar fila com o servidor
export async function syncQueue() {
  if (!isOnline()) return { synced: 0, pending: 0 };

  const { default: api } = await import('@/lib/api');
  const pending = await offlineDB.getPending();

  let synced = 0;
  for (const action of pending) {
    try {
      switch (action.type) {
        case 'ACCEPT_ORDER':
          await api.post(`/api/orders/${action.orderId}/accept`);
          break;
        case 'CONFIRM_COLLECT':
          await api.put(`/api/orders/${action.orderId}/status`, { status: 'PICKED_UP' });
          break;
        case 'CONFIRM_DELIVERY':
          await api.put(`/api/orders/${action.orderId}/status`, { status: 'DELIVERED' });
          break;
        case 'UPDATE_LOCATION':
          await api.post('/api/driver/location', {
            latitude: action.latitude,
            longitude: action.longitude
          });
          break;
        default:
          console.warn('Ação offline desconhecida:', action.type);
      }
      await offlineDB.markSynced(action.id);
      synced++;
    } catch (err) {
      console.error(`Erro ao sincronizar ação ${action.id}:`, err);
      // Incrementa tentativas — se passar de 5, marca como falha
      if (action.retries >= 5) {
        await offlineDB.markSynced(action.id); // Remove da fila
      }
    }
  }

  await offlineDB.clearSynced();
  return { synced, pending: pending.length - synced };
}

// Inicializar: sincronizar quando a internet voltar
export function initOfflineSync() {
  onConnectionRestored(async () => {
    console.log('[Offline] Internet restaurada — sincronizando fila...');
    const result = await syncQueue();
    if (result.synced > 0) {
      console.log(`[Offline] ${result.synced} ações sincronizadas`);
    }
  });

  // Tentar sincronizar periodicamente (a cada 30s se online)
  setInterval(async () => {
    if (isOnline()) {
      await syncQueue();
    }
  }, 30000);
}
