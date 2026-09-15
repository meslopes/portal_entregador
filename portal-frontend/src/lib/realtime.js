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
let gpsChannel = null;
let isSubscribed = false;

// Inicializar cliente Supabase (lazy)
function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
  const client = getClient();
  if (!client) return;

  const channelName = getChannelName(tenantId);
  
  // Reutilizar canal se já existe
  if (!gpsChannel || gpsChannel.topic !== `realtime:${channelName}`) {
    gpsChannel = client.channel(channelName, {
      config: { broadcast: { self: false } } // Não enviar de volta para si mesmo
    });
  }

  // Enviar via WebSocket (baixa latência)
  gpsChannel.send({
    type: 'broadcast',
    event: 'gps',
    payload: {
      driver_id: driverId,
      driver_type: driverType,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: Date.now()
    }
  }).catch(() => {});
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
  if (!client) return () => {};

  const channelName = getChannelName(tenantId);
  const channel = client.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel
    .on('broadcast', { event: 'gps' }, (payload) => {
      if (payload?.payload && onGPSUpdate) {
        onGPSUpdate(payload.payload);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribed = true;
      }
    });

  // Retornar função de cleanup
  return () => {
    isSubscribed = false;
    client.removeChannel(channel);
  };
}

/**
 * Verifica se o Supabase Realtime está configurado.
 */
export function isRealtimeAvailable() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export default {
  sendGPS,
  subscribeGPS,
  isRealtimeAvailable
};
