/**
 * Carregamento do Leaflet via CDN com Subresource Integrity (SRI).
 * Se o SRI falhar (alguns proxies/PWA), tenta de novo sem integrity.
 */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
// Hashes SRI (SHA-384) do leaflet@1.9.4
const LEAFLET_CSS_SRI = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
const LEAFLET_JS_SRI = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';

let loadPromise = null;

function injectCss(href, integrity) {
  return new Promise((resolve) => {
    // Evitar duplicar
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (integrity) {
      link.integrity = integrity;
      link.crossOrigin = 'anonymous';
    }
    link.onload = () => resolve();
    link.onerror = () => {
      // Fallback sem SRI
      if (integrity) {
        link.remove();
        injectCss(href, null).then(resolve);
      } else {
        resolve(); // CSS ausente: mapa ainda funciona, tiles podem falhar
      }
    };
    document.head.appendChild(link);
  });
}

function injectJs(src, integrity) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      script.remove();
      if (integrity) {
        // Retry sem SRI
        injectJs(src, null).then(resolve).catch(reject);
      } else {
        reject(new Error('Falha ao carregar Leaflet'));
      }
    };
    document.head.appendChild(script);
  });
}

/**
 * Garante que Leaflet (CSS+JS) está carregado.
 */
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await injectCss(LEAFLET_CSS, LEAFLET_CSS_SRI);
    const L = await injectJs(LEAFLET_JS, LEAFLET_JS_SRI);
    return L || window.L;
  })();

  return loadPromise;
}
