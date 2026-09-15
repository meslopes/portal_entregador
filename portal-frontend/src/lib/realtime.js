/**
 * Módulo de GPS em tempo real via Supabase Realtime (Broadcast).
 * 
 * Substitui o HTTP polling por WebSocket de baixa latência.
 * Entregadores enviam posição via channel.send(), admin/estabelecimento
 * recebem instantaneamente via channel.on('broadcast').
 * 
 * Mantém HTTP POST como fallback para persistência no banco.
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;
let subscribedChannels = {}; // Cache de canais inscritos por nome

// Log de debug (remover em produção final)
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Realtime GPS]', ...args);
}

// Inicializar cliente Supabase (lazy)
function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    log('Inicializando cliente Supabase:', SUPABASE_URL);
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (!supabase) {
    log('ERRO: Supabase não configurado. URL:', !!SUPABASE_URL, 'KEY:', !!SUPABASE_KEY);
  }
  return supabase;
}

/**
 * Retorna o canal GPS para um tenant específico.
 * O nome do canal é "gps:tenant_{id}" para isolar dados entre tenants.
 */
function getChannelName(tenantId) {
  return `gps:tenant_${tenantId || 'global'}`;
}

/**
 * Obtém ou cria um canal inscrito.
 * Canais precisam estar inscritos para enviar via WebSocket.
 */
function getOrCreateChannel(channelName) {
  const client = getClient();
  if (!client) return null;

  // Reutilizar canal já inscrito
  if (subscribedChannels[channelName]) {
    return subscribedChannels[channelName];
  }

  log('Criando e inscrevendo canal:', channelName);
  const channel = client.channel(channelName, {
    config: { broadcast: { self: false, ack: false } }
  });

  // Inscrever o canal (necessário para enviar via WebSocket)
  channel.subscribe((status) => {
    log('Canal', channelName, 'status:', status);
  });

  subscribedChannels[channelName] = channel;
  return channel;
}

/**
 * Envia posição do entregador via Broadcast (WebSocket).
 * Chamado pelo entregador a cada 1-2 segundos.
 * 
 * @param {number} driverId - ID do entregador
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} tenantId - ID do tenant
 * @param {string} driverType - 'platform' ou 'own'
 */
export function sendGPS(driverId, lat, lng, tenantId, driverType = 'platform') {
  const channelName = getChannelName(tenantId);
  const channel = getOrCreateChannel(channelName);
  if (!channel) return;

  const payload = {
    driver_id: driverId,
    driver_type: driverType,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    timestamp: Date.now()
  };

  channel.send({
    type: 'broadcast',
    event: 'gps',
    payload
  }).then(() => {
    if (DEBUG) log('GPS enviado:', driverId, lat.toFixed(5), lng.toFixed(5));
  }).catch((err) => {
    log('ERRO ao enviar GPS:', err);
  });
}

/**
 * Inscreve-se para receber atualizações de GPS de todos os entregadores.
 * Chamado pelo admin e estabelecimento.
 * 
 * @param {number} tenantId - ID do tenant
 * @param {function} onGPSUpdate - Callback: ({ driver_id, driver_type, lat, lng, timestamp })
 * @returns {function} Função para cancelar inscrição
 */
export function subscribeGPS(tenantId, onGPSUpdate) {
  const client = getClient();
  if (!client) {
    log('ERRO: subscribeGPS sem cliente Supabase');
    return () => {};
  }

  const channelName = getChannelName(tenantId);
  log('Inscrevendo para receber GPS no canal:', channelName);

  const channel = client.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel
    .on('broadcast', { event: 'gps' }, (payload) => {
      if (DEBUG) log('GPS recebido:', payload?.payload?.driver_id);
      if (payload?.payload && onGPSUpdate) {
        onGPSUpdate(payload.payload);
      }
    })
    .subscribe((status) => {
      log('Inscrição GPS status:', status);
    });

  // Retornar função de cleanup
  return () => {
    log('Desinscrevendo GPS canal:', channelName);
    client.removeChannel(channel);
    delete subscribedChannels[channelName];
  };
}

/**
 * Verifica se o Supabase Realtime está configurado.
 */
export function isRealtimeAvailable() {
  const available = !!(SUPABASE_URL && SUPABASE_KEY);
  if (!available) log('Realtime NÃO disponível — SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_KEY:', !!SUPABASE_KEY);
  return available;
}

export default {
  sendGPS,
  subscribeGPS,
  isRealtimeAvailable
};
