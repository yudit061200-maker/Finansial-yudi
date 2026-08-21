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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-2 select-none">
      <div className="flex items-center justify-between relative max-w-lg mx-auto">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-50 shadow-xs' : ''
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9.5px] mt-0.5 tracking-tight">Beranda</span>
        </button>

        {/* Tab 2: Transaksi */}
        <button
          onClick={() => handleTabClick('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 ${
            activeTab === 'transactions'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'transactions' ? 'bg-indigo-50 shadow-xs' : ''
            }`}
          >
            <ReceiptText className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9.5px] mt-0.5 tracking-tight">Transaksi</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="flex items-center gap-1 -mt-4">
          <button
            onClick={() => {
              triggerHaptic();
              onOpenQuickScan();
            }}
            title="Scan Struk Kamera"
            className="w-8.5 h-8.5 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20 active:scale-90 transition-transform cursor-pointer border border-white"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              onOpenNewTransaction();
            }}
            title="Tambah Transaksi Baru"
            className="w-10.5 h-10.5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-90 transition-transform cursor-pointer border-2 border-white"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Hutang & Piutang */}
        <button
          onClick={() => handleTabClick('debts')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 ${
            activeTab === 'debts'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'debts' ? 'bg-indigo-50 shadow-xs' : ''
            }`}
          >
            <HandCoins className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9.5px] mt-0.5 tracking-tight">Hutang</span>
        </button>

        {/* Tab 4: AI Chat */}
        <button
          onClick={() => handleTabClick('aichat')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 ${
            activeTab === 'aichat'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'aichat' ? 'bg-indigo-50 shadow-xs' : ''
            }`}
          >
            <BotMessageSquare className="w-4.5 h-4.5" />
          </div>
          <span className="text-[9.5px] mt-0.5 tracking-tight">AI Chat</span>
        </button>
      </div>
    </div>
  );
};
