import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  BotMessageSquare,
  Camera,
  Target,
  Plus,
  Sparkles,
  Smartphone,
  HandCoins,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Menu,
  Search,
  CloudCheck,
  Palette,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'dashboard' | 'transactions' | 'debts' | 'budgets' | 'salary' | 'aichat' | 'receipt';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onOpenQuickScan: () => void;
  onOpenAndroidModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenMobileSidebar?: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  isDbConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaction,
  onOpenQuickScan,
  onOpenAndroidModal,
  onOpenCommandPalette,
  onOpenMobileSidebar,
  isPrivacyMode = false,
  onTogglePrivacy,
  isDbConnected = true,
}) => {
  const { theme, toggleTheme, paletteConfig, setIsThemeModalOpen } = useTheme();
  const { currentUser, isEmailVerified, isAnonymous, openAuthModal } = useAuth();

  const tabLabels: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard Keuangan', subtitle: 'Ringkasan & Arus Kas Real-time' },
    transactions: { title: 'Mutasi & Transaksi', subtitle: 'Catatan Kas & Running Balance' },
    debts: { title: 'Buku Hutang & Piutang', subtitle: 'Jadwal Jatuh Tempo & Cicilan' },
    budgets: { title: 'Anggaran & Target', subtitle: 'Batas Pengeluaran & Tabungan' },
    salary: { title: 'Penghitungan Gaji (Payroll)', subtitle: 'Kalkulator Gaji Bersih (THP), PPh 21 TER & BPJS' },
    aichat: { title: 'Asisten AI Gemini', subtitle: 'Konsultasi Finansial Pintar' },
    receipt: { title: 'Scan Struk OCR AI', subtitle: 'Pindai Struk Belanja Otomatis' },
  };

  const currentMeta = tabLabels[activeTab] || tabLabels.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 select-none transition-colors">
      <div className="w-full px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Left: Mobile hamburger + Active Screen Title / Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* App title for mobile screens */}
            <div className="flex lg:hidden items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
                AS
              </div>
              <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-white">
                Artha<span className="text-indigo-600 dark:text-indigo-400">Smart</span>
              </span>
            </div>

            {/* Desktop Screen Title Breadcrumb */}
            <div className="hidden lg:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                  {currentMeta.title}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium -mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Center: Command Palette Trigger Search Box */}
          <div className="flex-1 max-w-md hidden md:block">
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer group text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="truncate">Cari transaksi, rekening, hutang, atau aksi...</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs">
                    Ctrl+K
                  </kbd>
                </div>
              </button>
            )}
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search icon on mobile */}
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="md:hidden p-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                title="Cari Data (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Privacy Mode Toggle */}
            {onTogglePrivacy && (
              <button
                onClick={onTogglePrivacy}
                aria-label={isPrivacyMode ? 'Tampilkan Nominal Saldo' : 'Sembunyikan Nominal (Mode Privasi)'}
                title={isPrivacyMode ? 'Tampilkan Saldo (Privasi Aktif)' : 'Sembunyikan Saldo (Mode Privasi)'}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  isPrivacyMode
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {isPrivacyMode ? (
                  <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Theme Palette Modal Trigger */}
            <button
              onClick={() => setIsThemeModalOpen(true)}
              aria-label="Pilih Tema Tampilan"
              title={`Pilih Tema Warna (Tema: ${paletteConfig.name})`}
              className="p-2 rounded-xl text-xs font-bold bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer active:scale-95 flex items-center justify-center relative group"
            >
              <Palette className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800"
                style={{ backgroundColor: paletteConfig.previewColors.primary }}
              />
            </button>

            {/* Theme Toggle on mobile / topbar */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              className="hidden sm:flex p-2 rounded-xl text-xs font-bold bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer active:scale-95 items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Quick Scan Action */}
            <button
              onClick={onOpenQuickScan}
              title="Scan Foto Struk Belanja (OCR AI)"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Scan Struk</span>
            </button>

            {/* Auth / User Profile Button */}
            {currentUser && !isAnonymous ? (
              <button
                id="btn-header-user-profile"
                onClick={() => openAuthModal(isEmailVerified ? 'profile' : 'verify')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 relative group ${
                  isEmailVerified
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100/80'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 hover:bg-amber-100/80'
                }`}
                title={`Akun: ${currentUser.email} (${isEmailVerified ? 'Email Terverifikasi' : 'Email Belum Terverifikasi'})`}
              >
                <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline max-w-[110px] truncate text-slate-800 dark:text-slate-200">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                {isEmailVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                )}
              </button>
            ) : (
              <button
                id="btn-header-login"
                onClick={() => openAuthModal('login')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                title="Masuk atau Daftar Akun Terverifikasi"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Masuk</span>
              </button>
            )}

            {/* Add Transaction Primary CTA */}
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white shadow-sm shadow-indigo-500/25 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Catat</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
