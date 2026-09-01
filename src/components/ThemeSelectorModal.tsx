import React from 'react';
import {
  Palette,
  Check,
  Sun,
  Moon,
  Sparkles,
  X,
  TrendingUp,
  Crown,
  Shield,
  Layers,
  Flame,
  LayoutDashboard,
  Wallet,
} from 'lucide-react';
import { useTheme, THEME_PALETTES, ThemePalette, ThemeMode } from '../context/ThemeContext';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, palette, setPalette, allPalettes } = useTheme();

  if (!isOpen) return null;

  const getPaletteIcon = (id: ThemePalette) => {
    switch (id) {
      case 'indigo':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'emerald':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'gold':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'sapphire':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'nordic':
        return <Layers className="w-4 h-4 text-zinc-500" />;
      case 'sunset':
        return <Flame className="w-4 h-4 text-rose-500" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Pusat Tema & Penampilan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih suasana warna visual dan mode terang/gelap sesuai gaya Anda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Mode Terang / Gelap Switcher */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block">
              1. Mode Pencahayaan (Lighting Mode)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold">Mode Terang</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cerah, segar, dan kontras tinggi di siang hari
                    </div>
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-300 flex items-center justify-center font-bold">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold">Mode Gelap (OLED/Dark)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Elegan, nyaman di mata, dan hemat daya
                    </div>
                  </div>
                </div>
                {theme === 'dark' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: 6 Pilihan Tema Warna Finansial */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                2. Palet Suasana Finansial (Color Palette Preset)
              </label>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                6 Tema Eksklusif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allPalettes.map((p) => {
                const isSelected = palette === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/25 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top bar with icon, title, and badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                            {getPaletteIcon(p.id)}
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400">
                              {p.tagline}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Color Swatch Preview */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full border border-white/40 shadow-xs"
                          style={{ backgroundColor: p.previewColors.primary }}
                          title={`Warna Utama: ${p.previewColors.primary}`}
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-white/40 shadow-xs"
                          style={{ backgroundColor: p.previewColors.accent }}
                          title={`Warna Aksen: ${p.previewColors.accent}`}
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs"
                          style={{ backgroundColor: p.previewColors.darkBg }}
                          title={`Latar Gelap: ${p.previewColors.darkBg}`}
                        />
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Pilih
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Pengaturan tema tersimpan otomatis di perangkat Anda.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
          >
            Selesai & Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};
