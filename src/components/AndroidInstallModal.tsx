import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  Camera,
  WifiOff,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'pwa' | 'apk'>('pwa');

  useEffect(() => {
    // Listen for the native Android PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'Untuk menginstal di Android:\n1. Buka menu browser Chrome (ikon titik 3 di kanan atas)\n2. Pilih "Tambahkan ke Layar Utama" atau "Instal Aplikasi"'
      );
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header with Android Theme */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-t-3xl relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Android Native PWA
                </span>
                <span className="text-xs text-indigo-200">v1.2.0</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                ArthaSmart untuk Android
              </h2>
            </div>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed mt-2">
            Jadikan ArthaSmart sebagai aplikasi ponsel native dengan akses cepat dari homescreen, offline cache, dan kamera scanner.
          </p>
        </div>

        {/* Navigation Switch */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveGuideTab('pwa')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeGuideTab === 'pwa'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instal Langsung (PWA)</span>
          </button>
          <button
            onClick={() => setActiveGuideTab('apk')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeGuideTab === 'apk'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Format APK / Google Play</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {activeGuideTab === 'pwa' ? (
            <>
              {/* Status Banner */}
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Aplikasi Terpasang!</div>
                    <div className="text-[11px] text-emerald-700">
                      ArthaSmart sudah aktif dalam mode aplikasi standalone di perangkat Anda.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Pasang Instan ke Layar Utama</h4>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Bebas penyimpanan besar (&lt; 2 MB), tidak perlu download manual dari Play Store.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instal ArthaSmart ke Android</span>
                  </button>
                </div>
              )}

              {/* Step by Step Manual Guide for Chrome Android */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cara Pasang Manual di Google Chrome Android:
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Tekan Menu Titik Tiga (⋮)</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Di pojok kanan atas browser Google Chrome pada ponsel Android Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Pilih "Tambahkan ke Layar Utama" / "Instal Aplikasi"</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Chrome akan otomatis membuat icon aplikasi resmi ArthaSmart di daftar aplikasi Android Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800">Buka Langsung Seperti Aplikasi Native</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Tampil full-screen tanpa address bar browser, lengkap dengan navigasi bottom bar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Native Android Features Checklist */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-800 mb-2">Fitur Khusus Android:</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Akses Kamera OCR</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700">
                    <WifiOff className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Offline Cache Shell</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Haptic Touch Vibration</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-time Firestore</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* TWA / APK Build Info */}
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1">Kemasan Paket APK & Google Play (TWA)</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Aplikasi ini telah memenuhi standar <strong>Trusted Web Activity (TWA)</strong> dan <strong>WebAPK</strong> resmi dari Google. Anda dapat membungkusnya menjadi file <code className="text-indigo-600 font-mono">.apk</code> atau <code className="text-indigo-600 font-mono">.aab</code> siap rilis ke Google Play Store.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-colors">
                    <div>
                      <div className="font-bold text-slate-800">1. PWABuilder (Instan APK Generator)</div>
                      <div className="text-[11px] text-slate-500">
                        Generator otomatis dari Microsoft untuk membuat APK Android siap pakai.
                      </div>
                    </div>
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-colors">
                    <div>
                      <div className="font-bold text-slate-800">2. Google Bubblewrap CLI</div>
                      <div className="text-[11px] text-slate-500">
                        CLI resmi Google Chrome untuk build file Android App Bundle (.aab) Play Store.
                      </div>
                    </div>
                    <a
                      href="https://github.com/GoogleChromeLabs/bubblewrap"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  <strong>Tips:</strong> Untuk pemakaian sehari-hari tanpa build tools, cukup pilih tab <strong>"Instal Langsung (PWA)"</strong> dan klik tombol <strong>"Instal ArthaSmart"</strong> pada browser ponsel Anda.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
