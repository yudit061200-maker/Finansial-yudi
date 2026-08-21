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
} from 'lucide-react';

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
  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
    { id: 'debts', label: 'Hutang & Piutang', icon: HandCoins },
    { id: 'budgets', label: 'Anggaran & Target', icon: Target },
    { id: 'aichat', label: 'AI Chat', icon: BotMessageSquare },
    { id: 'receipt', label: 'Scan Struk', icon: Camera },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand title (single line, no descriptor under DOM) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm text-white font-bold text-lg">
              <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin-slow"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-slate-900">ArthaSmart</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Bento Hub
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation links (single line) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenAndroidModal && (
              <button
                onClick={onOpenAndroidModal}
                title="Buka / Pasang di Android (PWA/APK)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors whitespace-nowrap cursor-pointer active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xs:inline">App Android</span>
              </button>
            )}
            <button
              onClick={onOpenQuickScan}
              title="Scan Foto Struk Belanja"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden xs:inline">Scan Struk</span>
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
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
