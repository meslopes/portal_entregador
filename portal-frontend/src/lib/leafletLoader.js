/**
 * Carregamento do Leaflet via CDN com Subresource Integrity (SRI).
 * Centraliza a injeção de <link>/<script> para não repetir em cada página
 * e garantir que o arquivo do CDN não foi adulterado.
 */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
// Hashes SRI (SHA-384) do leaflet@1.9.4 — atualizar se mudar a versão
const LEAFLET_CSS_SRI = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
const LEAFLET_JS_SRI = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';

let loadPromise = null;

/**
 * Garante que Leaflet (CSS+JS) está carregado. Reutiliza window.L se já existir.
 * Retorna Promise que resolve com o objeto global L.
 */
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    link.integrity = LEAFLET_CSS_SRI;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.integrity = LEAFLET_JS_SRI;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Falha ao carregar Leaflet'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
