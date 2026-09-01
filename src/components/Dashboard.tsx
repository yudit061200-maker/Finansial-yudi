import React, { useState, useMemo } from 'react';
import {
  Account,
  Transaction,
  Budget,
  FinancialGoal,
  FinancialHealthScore,
  DebtRecord,
} from '../types/finance';
import {
  formatRupiah,
  formatRupiahShort,
  formatDateIndo,
  formatDateToYMD,
  isDebtPaid,
} from '../utils/formatters';
import { getCashSummary } from '../utils/cashflow';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  BotMessageSquare,
  Camera,
  Target,
  Plus,
  ChevronRight,
  Edit2,
  HandCoins,
  Clock,
  RotateCcw,
  CreditCard,
  Building2,
  Activity,
  Layers,
  ArrowRight,
  Percent,
} from 'lucide-react';
import { NavTab } from './Header';
import { ConfirmModal } from './ConfirmModal';
import { DailyCashForecastWidget } from './DailyCashForecastWidget';
import { CashForecastCalendar } from './CashForecastCalendar';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  debts?: DebtRecord[];
  healthScore: FinancialHealthScore;
  isPrivacyMode?: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenNewTransaction: (defaultDate?: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onAddNewAccount?: () => void;
  onEditAccount?: (account: Account) => void;
  onDeleteAccount?: (accountId: string, deleteLinkedTransactions?: boolean) => void;
  onResetAccountBalance?: (accountId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  transactions,
  budgets,
  goals,
  debts = [],
  healthScore,
  isPrivacyMode = false,
  onNavigate,
  onOpenNewTransaction,
  onSelectTransaction,
  onAddNewAccount,
  onEditAccount,
  onDeleteAccount,
  onResetAccountBalance,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'last_30_days' | 'this_year'>('this_month');
  const [chartView, setChartView] = useState<'area' | 'bar'>('area');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [accountToReset, setAccountToReset] = useState<Account | null>(null);
  const [hoveredChartDay, setHoveredChartDay] = useState<{ dateStr: string; label: string; income: number; expense: number } | null>(null);

  // Helper for masking amounts if privacy mode is on
  const formatMoney = (amount: number, isShort = false) => {
    if (isPrivacyMode) {
      return 'Rp ••••••••';
    }
    return isShort ? formatRupiahShort(amount) : formatRupiah(amount);
  };

  // Dynamic greeting based on current time
  const dynamicGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  // Today Date formatted in Indonesian
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Total Net Worth (Assets across all accounts)
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Running Balance / Sisa Kas Berjalan
  const cashSummary = useMemo(() => {
    return getCashSummary(transactions, 0);
  }, [transactions]);

  // Debt & Receivable Stats
  const debtStats = useMemo(() => {
    const totalPayable = debts
      .filter((d) => (d.type === 'payable' || d.type === 'installment' || d.isInstallment) && !isDebtPaid(d))
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalReceivable = debts
      .filter((d) => d.type === 'receivable' && !isDebtPaid(d))
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const activeCount = debts.filter((d) => !isDebtPaid(d)).length;

    const urgentList = debts.filter((d) => {
      if (isDebtPaid(d) || !d.dueDate) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(d.dueDate);
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    });

    return { totalPayable, totalReceivable, activeCount, urgentCount: urgentList.length, urgentList };
  }, [debts]);

  // Filter transactions by timeRange
  const filteredTransactions = useMemo(() => {
    if (timeRange === 'all') return transactions;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return true;

      if (timeRange === 'this_month') {
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      } else if (timeRange === 'last_30_days') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      } else if (timeRange === 'this_year') {
        return txDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [transactions, timeRange]);

  // Total Income & Expense in period
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const incomeCount = useMemo(() => filteredTransactions.filter((t) => t.type === 'income').length, [filteredTransactions]);
  const expenseCount = useMemo(() => filteredTransactions.filter((t) => t.type === 'expense').length, [filteredTransactions]);

  const netCashflow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netCashflow / totalIncome) * 100)) : 0;

  // Group expenses by category
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });

    const list = Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    return list.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, totalExpense]);

  // Daily Cash Flow for SVG Chart (last 14 days)
  const chartDays = useMemo(() => {
    const daysMap = new Map<string, { dateStr: string; label: string; income: number; expense: number }>();
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = formatDateToYMD(d);
      const dayNum = d.getDate();
      const monthShort = d.toLocaleString('id-ID', { month: 'short' });
      daysMap.set(dateStr, {
        dateStr,
        label: `${dayNum} ${monthShort}`,
        income: 0,
        expense: 0,
      });
    }

    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date ? tx.date.split('T')[0] : '';
      const entry = daysMap.get(dateKey);
      if (entry) {
        if (tx.type === 'income') entry.income += tx.amount;
        if (tx.type === 'expense') entry.expense += tx.amount;
      }
    });

    return Array.from(daysMap.values());
  }, [filteredTransactions]);

  // Max value for chart scaling
  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartDays.map((d) => Math.max(d.income, d.expense)), 500000);
    return max * 1.18;
  }, [chartDays]);

  // Burn Rate calculations
  const daysInMonth = 31;
  const currentDay = new Date().getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const avgDailyExpense = currentDay > 0 ? Math.round(totalExpense / currentDay) : 0;

  // Category Colors
  const CATEGORY_COLORS: Record<string, string> = {
    'Makanan & Minuman': '#F97316',
    'Belanja & Groceries': '#3B82F6',
    'Transportasi': '#6366F1',
    'Tagihan & Utilitas': '#EF4444',
    'Hiburan & Rekreasi': '#8B5CF6',
    'Kesehatan & Farmasi': '#EC4899',
    'Kebutuhan Rumah': '#10B981',
    'Pendidikan & Kerja': '#06B6D4',
    'Investasi & Tabungan': '#14B8A6',
    'Lain-lain': '#64748B',
  };

  const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || '#94A3B8';

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Dynamic Header & Financial Velocity Status Bar */}
      <div className="fintech-card rounded-3xl p-5 sm:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Greeting & Meta */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
                <Sparkles className="w-6 h-6 text-indigo-200" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  {dynamicGreeting}, Portofolio Keuangan
                </h1>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Live Sync
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                <span>{todayFormatted}</span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {accounts.length} Akun & Rekening Aktif
                </span>
                {netCashflow >= 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Surplus Kas +{formatMoney(netCashflow, true)}
                    </span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Defisit Periode {formatMoney(netCashflow, true)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Period Filter */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 self-start lg:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setTimeRange('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timeRange === 'this_month'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setTimeRange('last_30_days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timeRange === 'last_30_days'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setTimeRange('this_year')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timeRange === 'this_year'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tahun Ini
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Precision Fintech Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Net Worth (Kekayaan Bersih) */}
        <div className="fintech-card rounded-3xl p-5.5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Kekayaan Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight font-mono tabular-nums">
              {formatMoney(totalNetWorth)}
            </div>
            
            <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 font-semibold flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{accounts.length} Akun Terdaftar</span>
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                Kas: {formatMoney(cashSummary.currentSisaKas, true)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Income (Pemasukan) */}
        <div className="fintech-card rounded-3xl p-5.5 flex flex-col justify-between relative overflow-hidden group border-emerald-100/90 dark:border-emerald-950/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-300 tracking-tight font-mono tabular-nums">
              {formatMoney(totalIncome)}
            </div>

            <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-emerald-100/60 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{incomeCount} Transaksi Masuk</span>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">Inflow</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Expense (Pengeluaran) */}
        <div className="fintech-card rounded-3xl p-5.5 flex flex-col justify-between relative overflow-hidden group border-rose-100/90 dark:border-rose-950/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono tabular-nums">
              {formatMoney(totalExpense)}
            </div>

            <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-rose-100/60 dark:border-rose-900/30 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <div className="flex items-center gap-1">
                <span className="text-slate-700 dark:text-slate-300 font-bold">{expenseCount} Transaksi</span>
              </div>
              <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                ~{formatMoney(avgDailyExpense, true)}/hari
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Net Cash Flow & Savings Rate (Fintech Luxury Dark Signature Tile) */}
        <div className="rounded-3xl p-5.5 text-white shadow-md relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-slate-900 via-[#0B0F19] to-indigo-950 border border-slate-800">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold text-indigo-200 uppercase tracking-wider">
              Arus Kas Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-center shadow-xs">
              <PiggyBank className="w-4 h-4 text-indigo-300" />
            </div>
          </div>

          <div className="mt-4 relative z-10">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono tabular-nums">
              {formatMoney(netCashflow)}
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
              <span className="font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                <Percent className="w-3 h-3" />
                {savingsRate}% Rasio Simpan
              </span>
              <span className="text-slate-400 text-[11px] font-semibold">
                {netCashflow >= 0 ? 'Surplus' : 'Defisit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Interactive Quick Actions Dock */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('debts')}
          className="fintech-card p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <HandCoins className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors truncate">
              Hutang & Kredit
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              {debtStats.activeCount > 0 ? `${debtStats.activeCount} Aktif` : 'Catat Tagihan'}
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('aichat')}
          className="fintech-card p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <BotMessageSquare className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors truncate">
              Input via Chat AI
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              Ketik santai
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('receipt')}
          className="fintech-card p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Camera className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
              Scan Struk OCR
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              Ekstraksi AI
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('budgets')}
          className="fintech-card p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Target className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
              Anggaran & Target
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              {goals.length} Impian
            </div>
          </div>
        </button>

        <button
          onClick={() => onOpenNewTransaction()}
          className="col-span-2 sm:col-span-1 fintech-card p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
              + Catat Manual
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
              Entri Cepat
            </div>
          </div>
        </button>
      </div>

      {/* Debt & Receivable Urgency Notification Banner (if any) */}
      {(debtStats.totalPayable > 0 || debtStats.totalReceivable > 0) && (
        <div className="fintech-card rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Buku Hutang, Piutang & Cicilan</h3>
                {debtStats.urgentCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {debtStats.urgentCount} Jatuh Tempo Dekat
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Hutang Saya: <strong className="text-rose-600 dark:text-rose-400">{formatMoney(debtStats.totalPayable)}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Piutang: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(debtStats.totalReceivable)}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('debts')}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Buka Rincian Hutang</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Widget Perkiraan Sisa Kas Harian (Proyeksi Dinamis & Simulasi Burn Rate) */}
      <DailyCashForecastWidget
        accounts={accounts}
        transactions={transactions}
        debts={debts}
        budgets={budgets}
        isPrivacyMode={isPrivacyMode}
        onOpenNewTransaction={onOpenNewTransaction}
        onNavigateToDebts={() => onNavigate('debts')}
      />

      {/* Kalender Perkiraan Sisa Kas (Aktual & Proyeksi Likuiditas) */}
      <CashForecastCalendar
        accounts={accounts}
        transactions={transactions}
        debts={debts}
        budgets={budgets}
        isPrivacyMode={isPrivacyMode}
        onOpenNewTransaction={onOpenNewTransaction}
        onSelectTransaction={onSelectTransaction}
        onNavigateToDebts={() => onNavigate('debts')}
      />

      {/* Main Dynamic Charts & Category Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cashflow Dynamic Chart */}
        <div className="lg:col-span-2 fintech-card rounded-3xl p-6 flex flex-col justify-between transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tren Arus Kas (14 Hari Terakhir)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Visualisasi dinamis dinamika pemasukan vs pengeluaran</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Chart Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                <button
                  onClick={() => setChartView('area')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    chartView === 'area'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Kurva
                </button>
                <button
                  onClick={() => setChartView('bar')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    chartView === 'bar'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Batang
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Masuk
                </span>
                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  Keluar
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="mt-6 w-full h-64 relative">
            {hoveredChartDay && (
              <div className="absolute top-2 right-4 z-20 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg border border-slate-800 animate-in fade-in flex items-center gap-3">
                <span className="font-bold text-slate-300">{hoveredChartDay.label}</span>
                <span className="text-emerald-400 font-semibold">+{formatMoney(hoveredChartDay.income)}</span>
                <span className="text-indigo-400 font-semibold">-{formatMoney(hoveredChartDay.expense)}</span>
              </div>
            )}

            <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 60, 120, 180].map((y, idx) => (
                <g key={idx}>
                  <line
                    x1="45"
                    y1={y}
                    x2="690"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    className="dark:stroke-slate-800"
                  />
                  <text x="40" y={y + 4} fill="#94A3B8" fontSize="10" fontWeight="600" textAnchor="end">
                    {formatMoney(maxChartValue * ((180 - y) / 180), true)}
                  </text>
                </g>
              ))}

              {/* Area Curve View */}
              {chartView === 'area' && (
                <>
                  {/* Income Area & Line */}
                  {(() => {
                    const totalDays = chartDays.length;
                    const slotWidth = (640 / (totalDays - 1 || 1));
                    const points = chartDays.map((d, i) => {
                      const x = 50 + i * slotWidth;
                      const y = 180 - (maxChartValue > 0 ? (d.income / maxChartValue) * 180 : 0);
                      return `${x},${y}`;
                    });
                    const dLine = `M ${points.join(' L ')}`;
                    const dArea = `M 50,180 L ${points.join(' L ')} L ${50 + (totalDays - 1) * slotWidth},180 Z`;

                    return (
                      <g>
                        <path d={dArea} fill="url(#incomeAreaGrad)" />
                        <path d={dLine} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  })()}

                  {/* Expense Area & Line */}
                  {(() => {
                    const totalDays = chartDays.length;
                    const slotWidth = (640 / (totalDays - 1 || 1));
                    const points = chartDays.map((d, i) => {
                      const x = 50 + i * slotWidth;
                      const y = 180 - (maxChartValue > 0 ? (d.expense / maxChartValue) * 180 : 0);
                      return `${x},${y}`;
                    });
                    const dLine = `M ${points.join(' L ')}`;
                    const dArea = `M 50,180 L ${points.join(' L ')} L ${50 + (totalDays - 1) * slotWidth},180 Z`;

                    return (
                      <g>
                        <path d={dArea} fill="url(#expenseAreaGrad)" />
                        <path d={dLine} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  })()}
                </>
              )}

              {/* Bar View or Interactive Points */}
              {chartDays.map((day, idx) => {
                const totalDays = chartDays.length;
                const slotWidth = (640 / totalDays);
                const xBase = 50 + idx * slotWidth;
                const barW = Math.max(8, slotWidth * 0.35);

                const incomeH = maxChartValue > 0 ? (day.income / maxChartValue) * 180 : 0;
                const expenseH = maxChartValue > 0 ? (day.expense / maxChartValue) * 180 : 0;

                const incomeY = 180 - incomeH;
                const expenseY = 180 - expenseH;

                return (
                  <g
                    key={`chart-day-${day.dateStr}-${idx}`}
                    onMouseEnter={() => setHoveredChartDay(day)}
                    onMouseLeave={() => setHoveredChartDay(null)}
                    className="cursor-pointer"
                  >
                    {chartView === 'bar' ? (
                      <>
                        {incomeH > 0 && (
                          <rect
                            x={xBase}
                            y={incomeY}
                            width={barW}
                            height={incomeH}
                            fill="#10B981"
                            rx="4"
                            className="transition-all hover:opacity-80"
                          />
                        )}
                        {expenseH > 0 && (
                          <rect
                            x={xBase + barW + 2}
                            y={expenseY}
                            width={barW}
                            height={expenseH}
                            fill="#6366F1"
                            rx="4"
                            className="transition-all hover:opacity-80"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {/* Interactive Dot for Area Curve */}
                        <circle
                          cx={50 + idx * (640 / (totalDays - 1 || 1))}
                          cy={incomeY}
                          r={day.income > 0 ? 3.5 : 0}
                          fill="#10B981"
                          className="transition-all hover:r-5"
                        />
                        <circle
                          cx={50 + idx * (640 / (totalDays - 1 || 1))}
                          cy={expenseY}
                          r={day.expense > 0 ? 3.5 : 0}
                          fill="#6366F1"
                          className="transition-all hover:r-5"
                        />
                      </>
                    )}

                    {/* Day X-Axis Label */}
                    <text
                      x={xBase + barW}
                      y="205"
                      fill="#64748B"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {day.label.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Base Axis Line */}
              <line x1="45" y1="180" x2="690" y2="180" stroke="#E2E8F0" strokeWidth="1.5" className="dark:stroke-slate-700" />
            </svg>
          </div>

          {/* Footer Metrics */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3 text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">🔥 Burn Rate Harian:</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">{formatMoney(avgDailyExpense)} / hari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">📅 Sisa Bulan Ini:</span>
              <span className="text-slate-900 dark:text-white font-bold">{remainingDays} hari</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Category Breakdown Bento Tile */}
        <div className="fintech-card rounded-3xl p-6 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Alokasi Pengeluaran</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                {categoryExpenses.length} Kategori
              </span>
            </div>

            {/* Category Donut Representation */}
            <div className="mt-5 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {categoryExpenses.map((cat, idx) => {
                    const prevSum = categoryExpenses
                      .slice(0, idx)
                      .reduce((acc, c) => acc + c.percentage, 0);
                    const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`;
                    const strokeDashoffset = -prevSum;

                    return (
                      <circle
                        key={cat.category}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={getCategoryColor(cat.category)}
                        strokeWidth="14"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all hover:opacity-80 cursor-pointer"
                        pathLength="100"
                        onClick={() =>
                          setActiveCategoryFilter(
                            activeCategoryFilter === cat.category ? null : cat.category
                          )
                        }
                      />
                    );
                  })}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Keluar</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatMoney(totalExpense, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="mt-5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {categoryExpenses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Belum ada pengeluaran tercatat
                </div>
              ) : (
                categoryExpenses.map((cat) => (
                  <div
                    key={cat.category}
                    onClick={() =>
                      setActiveCategoryFilter(
                        activeCategoryFilter === cat.category ? null : cat.category
                      )
                    }
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors text-xs ${
                      activeCategoryFilter === cat.category
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getCategoryColor(cat.category) }}
                      ></span>
                      <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-900 dark:text-white">{formatMoney(cat.amount)}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold w-7 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('budgets')}
            className="mt-4 w-full py-2 px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Kelola Anggaran</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Account Wallets (Fintech Debit Card Deck) & AI Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts & Wallets Card Grid */}
        <div className="lg:col-span-2 fintech-card rounded-3xl p-6 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Rekening, E-Wallet & Kas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Likuiditas dana dan saldo berjalan per akun</p>
            </div>
            <div className="flex items-center gap-2">
              {onAddNewAccount && (
                <button
                  onClick={onAddNewAccount}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Akun</span>
                </button>
              )}
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="mt-5 p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Rekening Terdaftar</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Tambahkan rekening bank (BCA, Mandiri, BRI), dompet digital, atau uang tunai untuk mulai mencatat.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => {
                const percentOfTotal =
                  totalNetWorth > 0 ? Math.round((acc.balance / totalNetWorth) * 100) : 0;

                return (
                  <div
                    key={acc.id}
                    className="group relative p-4.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Metallic / Provider Badge */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs ring-1 ring-black/10"
                          style={{ backgroundColor: acc.color || '#4F46E5' }}
                        >
                          {acc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{acc.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{acc.accountNumberMasked}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onResetAccountBalance && acc.balance !== 0 && (
                          <button
                            onClick={() => setAccountToReset(acc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Reset Saldo ke Rp 0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onEditAccount && (
                          <button
                            onClick={() => onEditAccount(acc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Edit & Kelola Akun"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="text-base font-extrabold text-slate-950 dark:text-white font-mono tabular-nums">
                        {formatMoney(acc.balance)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{percentOfTotal}%</div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentOfTotal}%`, backgroundColor: acc.color || '#4F46E5' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Financial Health Score (Dark Bento Accent Tile) */}
        <div className="rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0B0F19] to-indigo-950 border border-slate-800">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">AI Health Score</h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-400">
                <Sparkles className="w-3 h-3" />
                Verified
              </span>
            </div>

            {/* Score Ring */}
            <div className="mt-5 flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-400"
                    strokeDasharray={`${healthScore.score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{healthScore.score}</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">/ 100</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-emerald-400">{healthScore.status}</div>
                <div className="text-xs text-slate-300 mt-1">
                  Rasio Tabungan: <span className="font-bold text-white">{healthScore.savingsRate}%</span>
                </div>
                <div className="text-xs text-slate-300">
                  Dana Darurat: <span className="font-bold text-white">{healthScore.emergencyFundMonths} bln</span>
                </div>
              </div>
            </div>

            {/* AI Insights Recommendations */}
            <div className="mt-5 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Rekomendasi Cerdas:
              </div>
              {healthScore.insights.slice(0, 2).map((tip, i) => (
                <div
                  key={i}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-2"
                >
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('aichat')}
            className="mt-5 w-full py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors text-center cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Konsultasi dengan ArthaAI</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 4: Recent Transactions Feed */}
      <div className="fintech-card rounded-3xl p-6 transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Aktivitas Transaksi Terkini</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mutasi kas dan catatan pengeluaran harian</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada aktivitas transaksi. Klik "+ Catat" untuk menambahkan transaksi pertama Anda.
            </div>
          ) : (
            transactions.slice(0, 6).map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction?.(tx)}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 px-3 rounded-2xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm shadow-2xs ${
                        isExpense
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          : isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      ) : isIncome ? (
                        <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tx.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{tx.category}</span>
                        <span>•</span>
                        <span className="truncate">{acc?.name || 'Rekening'}</span>
                        {tx.source === 'ai_chat' && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                            AI Chat
                          </span>
                        )}
                        {tx.source === 'receipt_scan' && (
                          <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                            Scan OCR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div
                      className={`text-xs font-extrabold font-mono tabular-nums ${
                        isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {formatMoney(tx.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset Account Balance Confirm Modal */}
      <ConfirmModal
        isOpen={!!accountToReset}
        title="Kosongkan Saldo Akun?"
        message={
          accountToReset
            ? `Apakah Anda yakin ingin mereset saldo akun "${accountToReset.name}" (${formatRupiah(
                accountToReset.balance
              )}) menjadi Rp 0?`
            : ''
        }
        confirmText="Ya, Reset Saldo"
        cancelText="Batal"
        variant="warning"
        icon="alert"
        onConfirm={() => {
          if (accountToReset && onResetAccountBalance) {
            onResetAccountBalance(accountToReset.id);
            setAccountToReset(null);
          }
        }}
        onClose={() => setAccountToReset(null)}
      />
    </div>
  );
};
