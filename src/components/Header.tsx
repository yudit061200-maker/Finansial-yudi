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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavTab = 'dashboard' | 'transactions' | 'debts' | 'budgets' | 'aichat' | 'receipt';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onOpenQuickScan: () => void;
  onOpenAndroidModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaction,
  onOpenQuickScan,
  onOpenAndroidModal,
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
    { id: 'debts', label: 'Hutang & Piutang', icon: HandCoins },
    { id: 'budgets', label: 'Anggaran & Target', icon: Target },
    { id: 'aichat', label: 'AI Chat', icon: BotMessageSquare },
    { id: 'receipt', label: 'Scan Struk', icon: Camera },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 select-none transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand title (single line, no child descriptors) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs ring-1 ring-slate-800 dark:ring-indigo-500">
              <span className="bg-gradient-to-tr from-indigo-400 to-indigo-200 dark:from-white dark:to-indigo-100 bg-clip-text text-transparent font-black">AS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-950 dark:text-white">ArthaSmart</span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded-full">
                AI Cloud
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation links (single line) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              className="p-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180" />
              )}
            </button>

            {onOpenAndroidModal && (
              <button
                onClick={onOpenAndroidModal}
                title="Buka / Pasang di Android (PWA/APK)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-all whitespace-nowrap cursor-pointer active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xs:inline">Android App</span>
              </button>
            )}
            <button
              onClick={onOpenQuickScan}
              title="Scan Foto Struk Belanja"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden xs:inline">Scan Struk</span>
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs shadow-indigo-200 dark:shadow-indigo-950 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
