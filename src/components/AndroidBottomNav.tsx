import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  BotMessageSquare,
  Target,
  Plus,
  Camera,
  HandCoins,
} from 'lucide-react';
import { NavTab } from './Header';

interface AndroidBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onOpenQuickScan: () => void;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaction,
  onOpenQuickScan,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleTabClick = (tab: NavTab) => {
    triggerHaptic();
    onTabChange(tab);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)] pb-[max(env(safe-area-inset-bottom),10px)] pt-2 px-3 select-none transition-colors">
      <div className="flex items-center justify-around relative max-w-md mx-auto">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-slate-950 dark:text-white font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs ring-1 ring-indigo-100 dark:ring-indigo-800' : ''
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Beranda</span>
        </button>

        {/* Tab 2: Transaksi */}
        <button
          onClick={() => handleTabClick('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'transactions'
              ? 'text-slate-950 dark:text-white font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'transactions' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs ring-1 ring-indigo-100 dark:ring-indigo-800' : ''
            }`}
          >
            <ReceiptText className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Transaksi</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="flex items-center gap-1.5 -mt-6">
          <button
            onClick={() => {
              triggerHaptic();
              onOpenQuickScan();
            }}
            title="Scan Struk Kamera"
            className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/30 active:scale-90 transition-transform cursor-pointer border-2 border-white dark:border-slate-700 ring-1 ring-slate-800"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              onOpenNewTransaction();
            }}
            title="Tambah Transaksi Baru"
            className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 active:scale-90 transition-transform cursor-pointer border-2 border-white dark:border-slate-800 ring-1 ring-indigo-500"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Hutang & Kredit */}
        <button
          onClick={() => handleTabClick('debts')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'debts'
              ? 'text-slate-950 dark:text-white font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'debts' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs ring-1 ring-indigo-100 dark:ring-indigo-800' : ''
            }`}
          >
            <HandCoins className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Hutang</span>
        </button>

        {/* Tab 4: AI Chat */}
        <button
          onClick={() => handleTabClick('aichat')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
            activeTab === 'aichat'
              ? 'text-slate-950 dark:text-white font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'aichat' ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs ring-1 ring-indigo-100 dark:ring-indigo-800' : ''
            }`}
          >
            <BotMessageSquare className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">AI Chat</span>
        </button>
      </div>
    </div>
  );
};
