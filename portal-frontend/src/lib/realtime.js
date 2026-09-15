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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;
let channels = {}; // Canais por nome
let channelReady = {}; // Quais canais estão prontos (SUBSCRIBED)

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Realtime GPS]', ...args);
}

function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    log('Inicializando cliente Supabase:', SUPABASE_URL);
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (!supabase) {
    log('ERRO: Supabase não configurado');
  }
  return supabase;
}

function getChannelName(tenantId) {
  return `gps:tenant_${tenantId || 'global'}`;
}

/**
 * Obtém ou cria um canal inscrito. Retorna o canal APENAS quando pronto.
 */
function getReadyChannel(channelName) {
  const client = getClient();
  if (!client) return null;

  // Canal já existe e está pronto
  if (channels[channelName] && channelReady[channelName]) {
    return channels[channelName];
  }

  // Canal existe mas ainda não está pronto
  if (channels[channelName]) {
    return null;
  }

  // Criar novo canal
  log('Criando canal:', channelName);
  const channel = client.channel(channelName, {
    config: { broadcast: { self: false, ack: false } }
  });

  channel.subscribe((status) => {
    log('Canal', channelName, 'status:', status);
    if (status === 'SUBSCRIBED') {
      channelReady[channelName] = true;
      log('Canal', channelName, 'PRONTO para enviar');
    }
  });

  channels[channelName] = channel;
  return null; // Ainda não está pronto neste tick
}

/**
 * Envia posição do entregador via Broadcast (WebSocket).
 * Só envia quando o canal estiver SUBSCRIBED.
 */
export function sendGPS(driverId, lat, lng, tenantId, driverType = 'platform') {
  const channelName = getChannelName(tenantId);
  const channel = getReadyChannel(channelName);
  
  if (!channel) return; // Canal ainda não está pronto, tenta no próximo intervalo

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
 * Inscreve-se para receber atualizações de GPS.
 * Chamado pelo admin e estabelecimento.
 */
export function subscribeGPS(tenantId, onGPSUpdate) {
  const client = getClient();
  if (!client) {
    log('ERRO: subscribeGPS sem cliente Supabase');
    return () => {};
  }

  const channelName = getChannelName(tenantId);
  log('Inscrevendo para receber GPS:', channelName);

  const channel = client.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel
    .on('broadcast', { event: 'gps' }, (payload) => {
      if (DEBUG) log('GPS recebido de:', payload?.payload?.driver_id);
      if (payload?.payload && onGPSUpdate) {
        onGPSUpdate(payload.payload);
      }
    })
    .subscribe((status) => {
      log('Inscrição GPS status:', status);
    });

  return () => {
    log('Desinscrevendo GPS:', channelName);
    client.removeChannel(channel);
    delete channels[channelName];
    delete channelReady[channelName];
  };
}

/**
 * Verifica se o Supabase Realtime está configurado.
 */
export function isRealtimeAvailable() {
  const available = !!(SUPABASE_URL && SUPABASE_KEY);
  if (!available) log('Realtime NÃO disponível');
  return available;
}

export default {
  sendGPS,
  subscribeGPS,
  isRealtimeAvailable
};
