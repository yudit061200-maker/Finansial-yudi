import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  HandCoins,
  Target,
  Calculator,
  BotMessageSquare,
  Camera,
  Plus,
  Sparkles,
  Smartphone,
  CloudCheck,
  Loader2,
  Sun,
  Moon,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  Wallet,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  X,
  Palette,
  ShieldAlert,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { NavTab } from './Header';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatRupiahShort } from '../utils/formatters';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onOpenQuickScan: () => void;
  onOpenAndroidModal?: () => void;
  onOpenCommandPalette: () => void;
  onResetData: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  isDbConnected?: boolean;
  totalNetWorth: number;
  currentSisaKas: number;
  activeDebtsCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaction,
  onOpenQuickScan,
  onOpenAndroidModal,
  onOpenCommandPalette,
  onResetData,
  isPrivacyMode = false,
  onTogglePrivacy,
  isDbConnected = true,
  totalNetWorth,
  currentSisaKas,
  activeDebtsCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { theme, toggleTheme, paletteConfig, setIsThemeModalOpen } = useTheme();
  const { currentUser, isEmailVerified, isAnonymous, openAuthModal, logout } = useAuth();

  const formatMoney = (amount: number) => {
    if (isPrivacyMode) return 'Rp ••••••••';
    return formatRupiah(amount);
  };

  const navSections = [
    {
      group: 'Ringkasan Finansial',
      items: [
        {
          id: 'dashboard' as NavTab,
          label: 'Dashboard Keuangan',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'transactions' as NavTab,
          label: 'Mutasi & Arus Kas',
          icon: ReceiptText,
          badge: null,
        },
        {
          id: 'debts' as NavTab,
          label: 'Hutang & Piutang',
          icon: HandCoins,
          badge: activeDebtsCount > 0 ? `${activeDebtsCount} Aktif` : null,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
        },
        {
          id: 'budgets' as NavTab,
          label: 'Anggaran & Target',
          icon: Target,
          badge: null,
        },
        {
          id: 'salary' as NavTab,
          label: 'Penghitungan Gaji',
          icon: Calculator,
          badge: 'PPh 21 TER',
          badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300',
        },
      ],
    },
    {
      group: 'AI & Alat Otomasi',
      items: [
        {
          id: 'aichat' as NavTab,
          label: 'Asisten AI Finansial',
          icon: BotMessageSquare,
          badge: 'Gemini',
          badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300',
        },
        {
          id: 'receipt' as NavTab,
          label: 'Scan Struk Otomatis',
          icon: Camera,
          badge: 'OCR',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
        },
      ],
    },
  ];

  const handleItemClick = (tabId: NavTab) => {
    onTabChange(tabId);
    if (isOpenMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 border-r border-slate-200/80 dark:border-slate-800/90 select-none">
      {/* 1. Brand & Workspace Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div
            onClick={() => handleItemClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-500/20 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                <span>AS</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0B0F19] rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
                  Artha<span className="text-indigo-600 dark:text-indigo-400">Smart</span>
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-widest">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Sistem Keuangan Cerdas
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          {isOpenMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Global Command Search Shortcut */}
        <button
          onClick={() => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            onOpenCommandPalette();
          }}
          className="mt-3.5 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer group text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span>Cari cepat...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 2. Portfolio Miniature Card */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="fintech-card rounded-2xl p-3.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3 h-3 text-indigo-400" />
              <span>Kekayaan Bersih</span>
            </div>
            {onTogglePrivacy && (
              <button
                onClick={onTogglePrivacy}
                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-indigo-200 transition-colors cursor-pointer"
                title={isPrivacyMode ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}
              >
                {isPrivacyMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-white mt-1">
            {formatMoney(totalNetWorth)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-white/10">
            <span className="text-slate-400">Sisa Kas:</span>
            <span className="font-mono font-bold text-emerald-400">{formatMoney(currentSisaKas)}</span>
          </div>
        </div>
      </div>

      {/* 3. Primary CTA Quick Action */}
      <div className="px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            onOpenNewTransaction();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Catat Transaksi</span>
        </button>
        <button
          onClick={() => {
            if (isOpenMobile && onCloseMobile) onCloseMobile();
            onOpenQuickScan();
          }}
          title="Scan Struk Otomatis"
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
        >
          <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>

      {/* 4. Grouped Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-none">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              {section.group}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-2xs border border-indigo-200/80 dark:border-indigo-900/60'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Account & Email Verification Status Widget */}
      <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
        {currentUser && !isAnonymous ? (
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (isOpenMobile && onCloseMobile) onCloseMobile();
                  openAuthModal(isEmailVerified ? 'profile' : 'verify');
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                title="Kelola Akun & Profil"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {currentUser.email}
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  if (isOpenMobile && onCloseMobile) onCloseMobile();
                  await logout();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                title="Keluar (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email Verification Status Pill */}
            <button
              onClick={() => {
                if (isOpenMobile && onCloseMobile) onCloseMobile();
                openAuthModal('verify');
              }}
              className={`w-full py-1 px-2 rounded-lg text-[10px] font-extrabold flex items-center justify-between cursor-pointer transition-all border ${
                isEmailVerified
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isEmailVerified ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
                <span>{isEmailVerified ? 'Email Terverifikasi' : 'Verifikasi Email'}</span>
              </div>
              <span className="text-[9px] font-semibold opacity-80">
                {isEmailVerified ? 'Aman' : 'Kirim Ulang'}
              </span>
            </button>
          </div>
        ) : (
          <button
            id="btn-sidebar-login"
            onClick={() => {
              if (isOpenMobile && onCloseMobile) onCloseMobile();
              openAuthModal('login');
            }}
            className="w-full p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                  Masuk / Daftar Akun
                </div>
                <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 font-medium">
                  Email & Password Terverifikasi
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* 5. Footer: Android App, Theme Toggle, Real-time Sync & Reset */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 bg-slate-50/70 dark:bg-slate-900/50">
        {/* Firestore Real-time status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            {isDbConnected ? (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cloud Firestore Sync</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>Menghubungkan...</span>
              </>
            )}
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* Action Bar at bottom of sidebar */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {/* Android Modal trigger */}
          {onOpenAndroidModal && (
            <button
              onClick={() => {
                if (isOpenMobile && onCloseMobile) onCloseMobile();
                onOpenAndroidModal();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
              title="Panduan Instal Android"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Android</span>
            </button>
          )}

          {/* Theme Palette Modal Trigger */}
          <button
            onClick={() => {
              if (isOpenMobile && onCloseMobile) onCloseMobile();
              setIsThemeModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors relative group"
            title={`Ganti Tema Warna (Aktif: ${paletteConfig.name})`}
          >
            <Palette className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800"
              style={{ backgroundColor: paletteConfig.previewColors.primary }}
            />
          </button>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Reset Cloud Data */}
          <button
            onClick={() => {
              if (isOpenMobile && onCloseMobile) onCloseMobile();
              onResetData();
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
            title="Reset Data Cloud ke Bawaan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Permanent Sticky */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
