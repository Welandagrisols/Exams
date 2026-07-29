import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA?
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    setIsIos(ios);

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  };

  // Don't show if already installed, dismissed this session, or no trigger
  if (
    isInstalled ||
    dismissed ||
    sessionStorage.getItem("pwa-prompt-dismissed") ||
    (!prompt && !isIos)
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-[#1e3a5f] text-white rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">Install EduMetrics</p>
          {isIos ? (
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              Tap <span className="font-medium text-white">Share</span> then{" "}
              <span className="font-medium text-white">Add to Home Screen</span> to install.
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              Install to your home screen for quick access — works offline too.
            </p>
          )}
          {!isIos && (
            <button
              onClick={handleInstall}
              className="mt-2 bg-white text-[#1e3a5f] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
            >
              Install App
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/50 hover:text-white transition-colors flex-shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
