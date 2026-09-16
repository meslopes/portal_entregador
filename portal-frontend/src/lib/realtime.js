/**
 * Módulo de GPS em tempo real via Supabase Realtime (Broadcast).
 * 
 * Envio via WebSocket (channel.send()) — confiável, baixa latência.
 * Recepção via WebSocket subscription.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;
let sendChannel = null;      // Canal do remetente (entregador)
let sendChannelReady = false;
let receiveChannel = null;   // Canal do receptor (admin/estabelecimento)

const DEBUG = import.meta.env.DEV; // Só log em desenvolvimento
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

/**
 * Envia posição do entregador via Broadcast (WebSocket).
 * Cria e inscreve o canal uma vez, depois reutiliza.
 */
export function sendGPS(driverId, lat, lng, tenantId, driverType = 'platform') {
  const client = getClient();
  if (!client) return;

  const channelName = getChannelName(tenantId);

  // Criar canal de envio na primeira chamada
  if (!sendChannel) {
    log('Criando canal de envio:', channelName);
    sendChannel = client.channel(channelName);

    sendChannel.subscribe((status) => {
      log('Canal de envio status:', status);
      if (status === 'SUBSCRIBED') {
        sendChannelReady = true;
        log('Canal de envio PRONTO');
      }
    });
  }

  // Só enviar quando o canal estiver inscrito
  if (!sendChannelReady) return;

  const payload = {
    driver_id: driverId,
    driver_type: driverType,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    timestamp: Date.now()
  };

  // Enviar via WebSocket (confiável quando inscrito)
  sendChannel.send({
    type: 'broadcast',
    event: 'gps',
    payload
  }).then((resp) => {
    log('GPS enviado:', driverId, lat.toFixed(5), lng.toFixed(5), resp);
  }).catch((err) => {
    log('ERRO ao enviar GPS:', err);
  });
}

/**
 * Inscreve-se para receber atualizações de GPS via WebSocket.
 */
export function subscribeGPS(tenantId, onGPSUpdate) {
  const client = getClient();
  if (!client) {
    log('ERRO: subscribeGPS sem cliente Supabase');
    return () => {};
  }

  const channelName = getChannelName(tenantId);
  log('Inscrevendo para receber GPS:', channelName);

  receiveChannel = client.channel(channelName);

  receiveChannel
    .on('broadcast', { event: 'gps' }, (payload) => {
      log('GPS recebido de:', payload?.payload?.driver_id);
      if (payload?.payload && onGPSUpdate) {
        onGPSUpdate(payload.payload);
      }
    })
    .subscribe((status) => {
      log('Canal de recepção status:', status);
    });

  return () => {
    log('Desinscrevendo GPS:', channelName);
    client.removeChannel(receiveChannel);
    receiveChannel = null;
  };
}

export function isRealtimeAvailable() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export default { sendGPS, subscribeGPS, isRealtimeAvailable };
