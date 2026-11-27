import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Troca o manifesto do PWA conforme a área do app (2026-11-27).
 *
 * Rotas /own-driver → manifesto do ENTREGADOR (start_url /own-driver/login,
 * nome "muv.log - Entregador") — instalar a partir dessas telas gera o app do
 * entregador. Demais rotas → manifesto normal (login azul do estabelecimento).
 */
const PwaManifestSwitch = () => {
  const location = useLocation();
  const isOwnDriver = location.pathname.startsWith('/own-driver');

  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      link.setAttribute('href', isOwnDriver ? '/own-driver-manifest.json' : '/manifest.json');
    }
    document.title = isOwnDriver ? 'muv.log - Entregador' : 'muv.log - Portal Entregador';
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) {
      theme.setAttribute('content', isOwnDriver ? '#16a34a' : '#2563eb');
    }
  }, [isOwnDriver]);

  return null;
};

export default PwaManifestSwitch;
