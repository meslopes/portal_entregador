import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Banner de instalação PWA.
 * Captura o evento beforeinstallprompt do navegador e mostra
 * um botão para instalar o app como aplicativo nativo.
 * Só aparece quando o site é acessado via HTTPS (ou localhost).
 */
export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar se já foi dispensado nesta sessão
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true);
    }

    const handler = (e) => {
      // Prevenir o mini-infobar do Chrome
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('pwa-install-dismissed')) {
        setVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Se já está instalado, não mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 transition-all duration-300 ease-out">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Download className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Instalar muv.log</p>
          <p className="text-xs text-gray-500">Acesse mais rápido como aplicativo no seu celular</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
