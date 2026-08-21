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
} from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ShieldCheck,
  Sparkles,
  BotMessageSquare,
  Camera,
  Target,
  Plus,
  AlertTriangle,
  ChevronRight,
  Edit2,
  HandCoins,
  Clock,
  CheckCircle2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { NavTab } from './Header';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  debts?: DebtRecord[];
  healthScore: FinancialHealthScore;
  onNavigate: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
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
  onNavigate,
  onOpenNewTransaction,
  onSelectTransaction,
  onAddNewAccount,
  onEditAccount,
  onDeleteAccount,
  onResetAccountBalance,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'last_30_days' | 'this_year'>('this_month');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Total Net Worth (Assets across all accounts)
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Debt & Receivable Stats
  const debtStats = useMemo(() => {
    const totalPayable = debts
      .filter((d) => d.type === 'payable' && d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalReceivable = debts
      .filter((d) => d.type === 'receivable' && d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const activeCount = debts.filter((d) => d.status !== 'paid').length;

    const urgentList = debts.filter((d) => {
      if (d.status === 'paid' || !d.dueDate) return false;
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
    const currentMonth = now.getMonth(); // 0-indexed

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

  // Daily Cash Flow for SVG Chart (last 14 days or grouped)
  const chartDays = useMemo(() => {
    const daysMap = new Map<string, { dateStr: string; label: string; income: number; expense: number }>();
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
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
    return max * 1.15;
  }, [chartDays]);

  // Daily Burn Rate Forecast
  const daysInMonth = 31;
  const currentDay = new Date().getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const avgDailyExpense = currentDay > 0 ? Math.round(totalExpense / currentDay) : 0;
  const projectedMonthEndExpense = totalExpense + avgDailyExpense * remainingDays;

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
    <div className="space-y-6 pb-12">
      {/* Top Banner & Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ringkasan Keuangan Anda</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantau cashflow, catat transaksi dengan AI Chat & scan struk, dan kelola target finansial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setTimeRange('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              timeRange === 'this_month'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setTimeRange('last_30_days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              timeRange === 'last_30_days'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setTimeRange('this_year')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              timeRange === 'this_year'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tahun Ini
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              timeRange === 'all'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Hero Stat Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Worth Bento */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Kekayaan Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatRupiah(totalNetWorth)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{accounts.length} Akun & Dompet Aktif</span>
            </div>
          </div>
        </div>

        {/* Card 2: Income Bento (Emerald Tint) */}
        <div className="bg-emerald-50/70 rounded-3xl border border-emerald-100 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-900 tracking-tight">
              {formatRupiah(totalIncome)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-700 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gaji, Dividen & Freelance</span>
            </div>
          </div>
        </div>

        {/* Card 3: Expense Bento */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-600 tracking-tight">
              {formatRupiah(totalExpense)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 font-medium">
              <span>Rata-rata: {formatRupiah(avgDailyExpense)}/hari</span>
            </div>
          </div>
        </div>

        {/* Card 4: Net Cash Flow & Savings Rate Bento (Indigo Feature Tile) */}
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Arus Kas Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-white">
              {formatRupiah(netCashflow)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="font-bold bg-white/20 text-white px-2 py-0.5 rounded-full text-[11px]">
                {savingsRate}% Rasio Simpan
              </span>
              <span className="text-white/80 text-[11px] font-medium">Surplus Sehat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Bento Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('debts')}
          className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 group-hover:text-purple-600 transition-colors truncate">Hutang & Piutang</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">
              {debtStats.activeCount > 0 ? `${debtStats.activeCount} Catatan Aktif` : 'Catat Pinjaman'}
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('aichat')}
          className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BotMessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">Input via Chat AI</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">Ketik santai</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('receipt')}
          className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">Scan Struk Belanja</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">OCR AI Otomatis</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('budgets')}
          className="flex items-center gap-3.5 p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">Anggaran & Goals</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">Kelola Tabungan</div>
          </div>
        </button>

        <button
          onClick={onOpenNewTransaction}
          className="col-span-2 sm:col-span-1 flex items-center gap-3.5 p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors truncate">Manual Input</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">+ Catat Transaksi</div>
          </div>
        </button>
      </div>

      {/* Debt & Receivable Quick Highlight Alert if any active / urgent */}
      {(debtStats.totalPayable > 0 || debtStats.totalReceivable > 0) && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Buku Hutang & Piutang</h3>
                {debtStats.urgentCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {debtStats.urgentCount} Jatuh Tempo Dekat
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                <span className="text-slate-600 font-medium">
                  Hutang Saya: <strong className="text-rose-600">{formatRupiah(debtStats.totalPayable)}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">
                  Piutang Saya: <strong className="text-emerald-600">{formatRupiah(debtStats.totalReceivable)}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('debts')}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Buka Buku Catatan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cashflow Trend Chart (SVG) Bento Tile */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Analisis Arus Kas (14 Hari Terakhir)</h2>
              <p className="text-xs text-slate-500 font-medium">Perbandingan harian pemasukan vs pengeluaran</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Pemasukan
              </span>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Pengeluaran
              </span>
            </div>
          </div>

          {/* Interactive SVG Bar & Trend Chart with Light Theme */}
          <div className="mt-6 w-full h-64 relative">
            <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
              {/* Background Grid Lines */}
              {[0, 60, 120, 180].map((y, idx) => (
                <g key={idx}>
                  <line
                    x1="40"
                    y1={y}
                    x2="690"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x="35" y={y + 4} fill="#94A3B8" fontSize="10" fontWeight="600" textAnchor="end">
                    {formatRupiahShort(maxChartValue * ((180 - y) / 180))}
                  </text>
                </g>
              ))}

              {/* Bars per day */}
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
                  <g key={day.dateStr} className="group">
                    {/* Income Bar */}
                    {incomeH > 0 && (
                      <rect
                        x={xBase}
                        y={incomeY}
                        width={barW}
                        height={incomeH}
                        fill="#10B981"
                        rx="4"
                        className="transition-all hover:opacity-80 cursor-pointer shadow-sm"
                      >
                        <title>{`${day.label}: Pemasukan ${formatRupiah(day.income)}`}</title>
                      </rect>
                    )}

                    {/* Expense Bar */}
                    {expenseH > 0 && (
                      <rect
                        x={xBase + barW + 2}
                        y={expenseY}
                        width={barW}
                        height={expenseH}
                        fill="#6366F1"
                        rx="4"
                        className="transition-all hover:opacity-80 cursor-pointer shadow-sm"
                      >
                        <title>{`${day.label}: Pengeluaran ${formatRupiah(day.expense)}`}</title>
                      </rect>
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
              <line x1="40" y1="180" x2="690" y2="180" stroke="#E2E8F0" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Burn Rate & Runway Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3 text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">🔥 Rata-rata Burn Rate:</span>
              <span className="text-rose-600 font-bold">{formatRupiah(avgDailyExpense)} / hari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">📅 Sisa Hari Bulan Ini:</span>
              <span className="text-slate-900 font-bold">{remainingDays} hari</span>
              <span className="text-slate-400">(Estimasi sisa saldo: {formatRupiah(Math.max(0, totalNetWorth - (avgDailyExpense * remainingDays)))})</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Category Breakdown Bento Tile */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Alokasi Pengeluaran</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {categoryExpenses.length} Kategori
              </span>
            </div>

            {/* Category Donut Representation */}
            <div className="mt-5 flex items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
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
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Keluar</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatRupiahShort(totalExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="mt-5 space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoryExpenses.map((cat) => (
                <div
                  key={cat.category}
                  onClick={() =>
                    setActiveCategoryFilter(
                      activeCategoryFilter === cat.category ? null : cat.category
                    )
                  }
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                    activeCategoryFilter === cat.category
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(cat.category) }}
                    ></span>
                    <span className="text-slate-700 truncate font-semibold">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900">{formatRupiah(cat.amount)}</span>
                    <span className="text-[11px] text-slate-400 font-bold w-8 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('budgets')}
            className="mt-4 w-full py-2.5 px-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors text-center cursor-pointer"
          >
            Kelola Anggaran Kategori →
          </button>
        </div>
      </div>

      {/* Row 3: Account Distribution & Dark AI Health Score Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts & Wallets Balance Breakdown */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Saldo Akun & E-Wallet</h2>
              <p className="text-xs text-slate-500 font-medium">Total likuiditas yang tersedia di setiap rekening & dompet</p>
            </div>
            <div className="flex items-center gap-2">
              {onAddNewAccount && (
                <button
                  onClick={onAddNewAccount}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Akun</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Daftar Transaksi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="mt-5 p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Akun Rekening Terdaftar</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Tambahkan rekening bank, dompet digital (GoPay, OVO, DANA), atau uang tunai untuk mulai mencatat saldo.
              </p>
              {onAddNewAccount && (
                <button
                  onClick={onAddNewAccount}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Akun Rekening Baru</span>
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {accounts.map((acc) => {
                const percentOfTotal =
                  totalNetWorth > 0 ? Math.round((acc.balance / totalNetWorth) * 100) : 0;

                return (
                  <div
                    key={acc.id}
                    className="group relative p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                          style={{ backgroundColor: acc.color }}
                        >
                          {acc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 truncate">{acc.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{acc.accountNumberMasked}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onResetAccountBalance && acc.balance !== 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Kosongkan / Reset saldo akun "${acc.name}" menjadi Rp 0?`)) {
                                onResetAccountBalance(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Reset Saldo ke Rp 0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onEditAccount && (
                          <button
                            onClick={() => onEditAccount(acc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Edit & Kelola Akun"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="text-sm font-bold text-slate-900">{formatRupiah(acc.balance)}</div>
                      <div className="text-[11px] text-slate-500 font-bold">{percentOfTotal}%</div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200/70 h-2 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentOfTotal}%`, backgroundColor: acc.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Financial Health Score (Dark Bento Accent Card) */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">AI Health Insight</h2>
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
                  <span className="text-lg font-black text-white">{healthScore.score}</span>
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

            {/* AI Actionable Insights */}
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
            className="mt-5 w-full py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors text-center cursor-pointer shadow-md"
          >
            Konsultasi dengan ArthaAI →
          </button>
        </div>
      </div>

      {/* Row 4: Recent Transactions Feed with Bento styling */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
            <p className="text-xs text-slate-500 font-medium">Catatan transaksi harian terkini</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua Transaksi ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {transactions.slice(0, 6).map((tx) => {
            const acc = accounts.find((a) => a.id === tx.accountId);
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-3 rounded-2xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      isExpense
                        ? 'bg-rose-50 text-rose-600'
                        : isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {isExpense ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : isIncome ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">{tx.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                      <span>{formatDateIndo(tx.date)}</span>
                      <span>•</span>
                      <span className="text-slate-700 font-semibold">{tx.category}</span>
                      <span>•</span>
                      <span className="truncate">{acc?.name || 'Rekening'}</span>
                      {tx.source === 'ai_chat' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          AI Chat
                        </span>
                      )}
                      {tx.source === 'receipt_scan' && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          Scan Struk
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div
                    className={`text-xs font-bold ${
                      isExpense
                        ? 'text-rose-600'
                        : isIncome
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatRupiah(tx.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
