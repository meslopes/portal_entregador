/**
 * Módulo de GPS em tempo real via Supabase Realtime (Broadcast).
 * 
 * Envio via httpSend (REST API) — mais confiável.
 * Recepção via WebSocket subscription — baixa latência.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;
let channels = {};

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Realtime GPS]', ...args);
}

function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    log('Inicializando Supabase:', SUPABASE_URL);
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

function getChannelName(tenantId) {
  return `gps:tenant_${tenantId || 'global'}`;
}

function getChannel(channelName) {
  const client = getClient();
  if (!client) return null;

  if (channels[channelName]) return channels[channelName];

  log('Criando canal:', channelName);
  const channel = client.channel(channelName);
  channels[channelName] = channel;
  return channel;
}

/**
 * Envia posição do entregador via Broadcast (REST API).
 * httpSend não precisa de inscrição — envia direto para o servidor.
 */
export function sendGPS(driverId, lat, lng, tenantId, driverType = 'platform') {
  const client = getClient();
  if (!client) return;

  const channelName = getChannelName(tenantId);
  const channel = getChannel(channelName);
  if (!channel) return;

  const payload = {
    driver_id: driverId,
    driver_type: driverType,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    timestamp: Date.now()
  };

  // httpSend via REST API — confiável, não precisa de inscrição
  channel.httpSend('gps', payload).then(() => {
    if (DEBUG) log('GPS enviado:', driverId, lat.toFixed(5), lng.toFixed(5));
  }).catch((err) => {
    log('ERRO ao enviar GPS:', err);
  });
}

/**
 * Inscreve-se para receber atualizações de GPS via WebSocket.
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

  const channel = client.channel(channelName);

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
  };
}

export function isRealtimeAvailable() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export default { sendGPS, subscribeGPS, isRealtimeAvailable };
