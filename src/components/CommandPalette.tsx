import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Camera,
  BotMessageSquare,
  LayoutDashboard,
  ReceiptText,
  HandCoins,
  Target,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Account, Transaction, DebtRecord, FinancialGoal, Budget } from '../types/finance';
import { NavTab } from './Header';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { useTheme, ThemePalette } from '../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onOpenQuickScan: () => void;
  onSelectTransaction?: (tx: Transaction) => void;
  accounts: Account[];
  transactions: Transaction[];
  debts?: DebtRecord[];
  goals?: FinancialGoal[];
  budgets?: Budget[];
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenNewTransaction,
  onOpenQuickScan,
  onSelectTransaction,
  accounts,
  transactions,
  debts = [],
  goals = [],
  budgets = [],
  isPrivacyMode = false,
  onTogglePrivacy,
}) => {
  const [query, setQuery] = useState('');
  const { theme, toggleTheme, palette, setPalette, paletteConfig, setIsThemeModalOpen } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keydown handler for Escape & Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mask amount if privacy mode is active
  const formatMoney = (amount: number) => {
    if (isPrivacyMode) return 'Rp ••••••••';
    return formatRupiah(amount);
  };

  // Filtered results
  const filteredActions = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = [
      {
        id: 'new-tx',
        title: 'Catat Transaksi Baru',
        subtitle: 'Pemasukan, pengeluaran, atau transfer',
        icon: Plus,
        category: 'Aksi Cepat',
        run: () => {
          onClose();
          onOpenNewTransaction();
        },
      },
      {
        id: 'scan-receipt',
        title: 'Scan Struk Otomatis (OCR AI)',
        subtitle: 'Pindai struk belanja dengan kamera / foto',
        icon: Camera,
        category: 'Aksi Cepat',
        run: () => {
          onClose();
          onOpenQuickScan();
        },
      },
      {
        id: 'nav-dashboard',
        title: 'Buka Dashboard Keuangan',
        subtitle: 'Ringkasan saldo, arus kas, dan radar keuangan',
        icon: LayoutDashboard,
        category: 'Navigasi',
        run: () => {
          onClose();
          onNavigate('dashboard');
        },
      },
      {
        id: 'nav-transactions',
        title: 'Buka Mutasi & Transaksi',
        subtitle: 'Daftar riwayat dan sisa kas berjalan',
        icon: ReceiptText,
        category: 'Navigasi',
        run: () => {
          onClose();
          onNavigate('transactions');
        },
      },
      {
        id: 'nav-debts',
        title: 'Buka Buku Hutang & Piutang',
        subtitle: 'Pantau pinjaman, cicilan, dan piutang rekan',
        icon: HandCoins,
        category: 'Navigasi',
        run: () => {
          onClose();
          onNavigate('debts');
        },
      },
      {
        id: 'nav-budgets',
        title: 'Buka Anggaran & Target Impian',
        subtitle: 'Budget bulanan dan target tabungan',
        icon: Target,
        category: 'Navigasi',
        run: () => {
          onClose();
          onNavigate('budgets');
        },
      },
      {
        id: 'nav-aichat',
        title: 'Tanya Asisten AI ArthaSmart',
        subtitle: 'Konsultasi finansial pintar 24/7',
        icon: BotMessageSquare,
        category: 'AI & Otomasi',
        run: () => {
          onClose();
          onNavigate('aichat');
        },
      },
      {
        id: 'toggle-privacy',
        title: isPrivacyMode ? 'Tampilkan Nominal Saldo' : 'Sembunyikan Saldo (Mode Privasi)',
        subtitle: isPrivacyMode ? 'Matikan penyamaran nominal' : 'Sensor angka saldo di seluruh layar',
        icon: isPrivacyMode ? Eye : EyeOff,
        category: 'Preferensi',
        run: () => {
          onClose();
          onTogglePrivacy?.();
        },
      },
      {
        id: 'toggle-theme',
        title: theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap',
        subtitle: `Mode saat ini: ${theme === 'dark' ? 'Gelap (Dark)' : 'Terang (Light)'}`,
        icon: theme === 'dark' ? Sun : Moon,
        category: 'Preferensi',
        run: () => {
          onClose();
          toggleTheme();
        },
      },
      {
        id: 'open-theme-modal',
        title: 'Buka Pusat Tema & Penampilan',
        subtitle: `Ganti palet warna finansial (Aktif: ${paletteConfig.name})`,
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setIsThemeModalOpen(true);
        },
      },
      {
        id: 'palette-indigo',
        title: 'Ganti Tema: Midnight Indigo (Default)',
        subtitle: 'Palet canggih modern fintech global',
        icon: Sparkles,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('indigo');
        },
      },
      {
        id: 'palette-emerald',
        title: 'Ganti Tema: Emerald Wealth',
        subtitle: 'Nuansa hijau permata & pertumbuhan investasi',
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('emerald');
        },
      },
      {
        id: 'palette-gold',
        title: 'Ganti Tema: Black Gold Luxury',
        subtitle: 'Kesan mewah eksklusif ala kartu kredit Black Card',
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('gold');
        },
      },
      {
        id: 'palette-sapphire',
        title: 'Ganti Tema: Cyber Sapphire',
        subtitle: 'Biru perbankan digital & keamanan analitik data',
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('sapphire');
        },
      },
      {
        id: 'palette-nordic',
        title: 'Ganti Tema: Nordic Minimalist',
        subtitle: 'Estetika monokromatik bersih gaya Swiss / Apple',
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('nordic');
        },
      },
      {
        id: 'palette-sunset',
        title: 'Ganti Tema: Sunset Terracotta',
        subtitle: 'Warna rose peach hangat & ramah keluarga',
        icon: Palette,
        category: 'Tema & Tampilan',
        run: () => {
          onClose();
          setPalette('sunset');
        },
      },
    ];

    if (!q) return list;
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [query, isPrivacyMode, theme, onNavigate, onOpenNewTransaction, onOpenQuickScan, onTogglePrivacy, toggleTheme, onClose]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return transactions
      .filter((tx) => {
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const noteMatch = (tx.notes || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const amountMatch = String(tx.amount).includes(q);
        return titleMatch || noteMatch || catMatch || amountMatch;
      })
      .slice(0, 5);
  }, [query, transactions]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return accounts
      .filter((acc) => {
        return (
          acc.name.toLowerCase().includes(q) ||
          (acc.provider || '').toLowerCase().includes(q) ||
          acc.type.toLowerCase().includes(q)
        );
      })
      .slice(0, 4);
  }, [query, accounts]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return debts
      .filter((d) => {
        return (
          d.personName.toLowerCase().includes(q) ||
          (d.title || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q) ||
          (d.itemName || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 4);
  }, [query, debts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari transaksi, rekening, hutang, atau aksi cepat... (Ctrl+K)"
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-2 space-y-4 flex-1 scrollbar-none">
          {/* Section: Accounts matches */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                <span>Rekening & Dompet</span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      onClose();
                      onNavigate('dashboard');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {acc.provider || acc.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatMoney(acc.balance)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Transactions matches */}
          {filteredTransactions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <ReceiptText className="w-3 h-3" />
                <span>Transaksi Ditemukan</span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredTransactions.map((tx) => {
                  const isExp = tx.type === 'expense';
                  const isInc = tx.type === 'income';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        onClose();
                        if (onSelectTransaction) {
                          onSelectTransaction(tx);
                        } else {
                          onNavigate('transactions');
                        }
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isExp
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : isInc
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {isExp ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : isInc ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ReceiptText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {tx.title || tx.notes || tx.category}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateIndo(tx.date)} • {tx.category}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold ${
                          isExp
                            ? 'text-rose-600 dark:text-rose-400'
                            : isInc
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {isExp ? '-' : isInc ? '+' : ''}
                        {formatMoney(tx.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Debts matches */}
          {filteredDebts.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <HandCoins className="w-3 h-3" />
                <span>Catatan Hutang & Piutang</span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredDebts.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onClose();
                      onNavigate('debts');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <HandCoins className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{d.personName}</div>
                        <div className="text-[10px] text-slate-400">
                          {d.type === 'payable' ? 'Hutang Saya' : d.type === 'receivable' ? 'Piutang' : 'Cicilan'} •{' '}
                          {d.title || d.itemName || d.notes || 'Pinjaman'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      Sisa: {formatMoney(d.remainingAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Quick Actions & Navigation */}
          <div>
            <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Aksi & Navigasi</span>
            </div>
            <div className="mt-1 space-y-1">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    onClick={action.run}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {action.title}
                        </div>
                        <div className="text-[10px] text-slate-400">{action.subtitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {action.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Navigasi: <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">↓</kbd>
            </span>
            <span>
              Pilih: <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">Enter</kbd>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-500 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pencarian Cerdas ArthaSmart AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
