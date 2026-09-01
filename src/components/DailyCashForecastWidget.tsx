import React, { useState, useMemo } from 'react';
import {
  Account,
  Transaction,
  DebtRecord,
  Budget,
} from '../types/finance';
import {
  formatRupiah,
  formatRupiahShort,
  formatDateIndo,
  formatDateToYMD,
  getTodayDateString,
  isDebtPaid,
} from '../utils/formatters';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Plus,
  RefreshCw,
  Sliders,
  DollarSign,
  Info,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface DailyCashForecastWidgetProps {
  accounts: Account[];
  transactions: Transaction[];
  debts: DebtRecord[];
  budgets?: Budget[];
  isPrivacyMode?: boolean;
  onOpenNewTransaction?: (defaultDate?: string) => void;
  onNavigateToDebts?: () => void;
}

export const DailyCashForecastWidget: React.FC<DailyCashForecastWidgetProps> = ({
  accounts,
  transactions,
  debts,
  budgets = [],
  isPrivacyMode = false,
  onOpenNewTransaction,
  onNavigateToDebts,
}) => {
  const [horizonDays, setHorizonDays] = useState<number>(14); // 7, 14, 30, or end_of_month
  const [isCustomSimMode, setIsCustomSimMode] = useState<boolean>(false);
  const [customDailyExpense, setCustomDailyExpense] = useState<number>(0);
  const [customDailyIncome, setCustomDailyIncome] = useState<number>(0);
  const [includeDebts, setIncludeDebts] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'simulation'>('overview');
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // Helper mask
  const formatMoney = (val: number, isShort: boolean = false) => {
    if (isPrivacyMode) return '••••••';
    return isShort ? formatRupiahShort(val) : formatRupiah(val);
  };

  // 1. Current Real Available Liquid Cash
  const currentTotalCash = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  // 2. Historical Daily Average Analysis (Past 30 Days)
  const historicalAverages = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const recentTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= thirtyDaysAgo && d <= today;
    });

    const totalRecentExpense = recentTxs
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalRecentIncome = recentTxs
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Days with active transactions or standard 30-day divisor
    const avgDailyExpense = Math.round(totalRecentExpense / 30);
    const avgDailyIncome = Math.round(totalRecentIncome / 30);

    // 7-day average for more volatile short-term trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const last7Txs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= sevenDaysAgo && d <= today;
    });
    const total7DayExpense = last7Txs
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const avg7DayExpense = Math.round(total7DayExpense / 7);

    return {
      avgDailyExpense: avgDailyExpense || 50000,
      avgDailyIncome: avgDailyIncome || 0,
      avg7DayExpense: avg7DayExpense || avgDailyExpense || 50000,
      totalRecentExpense,
      totalRecentIncome,
    };
  }, [transactions]);

  // Initial custom state sync if custom is 0
  React.useEffect(() => {
    if (customDailyExpense === 0 && historicalAverages.avgDailyExpense > 0) {
      setCustomDailyExpense(historicalAverages.avgDailyExpense);
    }
  }, [historicalAverages.avgDailyExpense, customDailyExpense]);

  // Effective Daily Rates
  const effectiveDailyExpense = isCustomSimMode ? customDailyExpense : historicalAverages.avgDailyExpense;
  const effectiveDailyIncome = isCustomSimMode ? customDailyIncome : historicalAverages.avgDailyIncome;

  // 3. Days in Month & Days Remaining in Month
  const monthStats = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = today.getDate();
    const daysRemainingInMonth = Math.max(0, lastDayOfMonth - currentDay);

    return {
      lastDayOfMonth,
      currentDay,
      daysRemainingInMonth,
      monthName: today.toLocaleString('id-ID', { month: 'long' }),
    };
  }, []);

  // 4. Multi-Horizon Daily Cash Projection Matrix
  const forecastData = useMemo(() => {
    const today = new Date();
    const todayStr = getTodayDateString();
    
    // Determine number of days to project
    const daysCount = horizonDays;
    const dailyList: Array<{
      dayIndex: number;
      date: Date;
      dateStr: string;
      dayName: string;
      dayDateFormatted: string;
      isToday: boolean;
      startingBalance: number;
      projectedIncome: number;
      projectedExpense: number;
      duePayablesTotal: number;
      duePayablesList: DebtRecord[];
      dueReceivablesTotal: number;
      dueReceivablesList: DebtRecord[];
      netChange: number;
      endingBalance: number;
      isBelowZero: boolean;
      isBelowBuffer: boolean;
    }> = [];

    let rollingBalance = currentTotalCash;
    const safetyBuffer = 500000; // Rp 500.000 minimum safety buffer threshold

    for (let i = 0; i <= daysCount; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const targetDateStr = formatDateToYMD(targetDate);
      const isToday = i === 0;

      const startBal = rollingBalance;

      // Check scheduled debts & installments due on this day of month
      const targetDayOfMonth = targetDate.getDate();
      const matchingPayables: DebtRecord[] = [];
      const matchingReceivables: DebtRecord[] = [];

      if (includeDebts) {
        debts.forEach((d) => {
          if (isDebtPaid(d)) return;

          let isDue = false;
          // Check explicit dueDate
          if (d.dueDate && d.dueDate === targetDateStr) {
            isDue = true;
          } else if (d.dueDayOfMonth && d.dueDayOfMonth === targetDayOfMonth) {
            isDue = true;
          }

          if (isDue) {
            if (d.type === 'payable' || d.type === 'installment' || d.isInstallment) {
              matchingPayables.push(d);
            } else if (d.type === 'receivable') {
              matchingReceivables.push(d);
            }
          }
        });
      }

      const duePayablesAmount = matchingPayables.reduce(
        (sum, d) => sum + (d.monthlyInstallment || d.remainingAmount),
        0
      );
      const dueReceivablesAmount = matchingReceivables.reduce(
        (sum, d) => sum + (d.monthlyInstallment || d.remainingAmount),
        0
      );

      // On day 0 (today), factor remaining burn rate or 0 if already spent
      const baseDailyExpense = isToday ? Math.round(effectiveDailyExpense * 0.5) : effectiveDailyExpense;
      const baseDailyIncome = isToday ? 0 : effectiveDailyIncome;

      const totalDayIncome = baseDailyIncome + dueReceivablesAmount;
      const totalDayExpense = baseDailyExpense + duePayablesAmount;
      const netDay = totalDayIncome - totalDayExpense;

      const endBal = startBal + netDay;
      rollingBalance = endBal;

      dailyList.push({
        dayIndex: i,
        date: targetDate,
        dateStr: targetDateStr,
        dayName: targetDate.toLocaleDateString('id-ID', { weekday: 'short' }),
        dayDateFormatted: targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        isToday,
        startingBalance: startBal,
        projectedIncome: totalDayIncome,
        projectedExpense: totalDayExpense,
        duePayablesTotal: duePayablesAmount,
        duePayablesList: matchingPayables,
        dueReceivablesTotal: dueReceivablesAmount,
        dueReceivablesList: matchingReceivables,
        netChange: netDay,
        endingBalance: endBal,
        isBelowZero: endBal < 0,
        isBelowBuffer: endBal < safetyBuffer,
      });
    }

    // Key milestone balances
    const tomorrowItem = dailyList[1] || dailyList[0];
    const day7Item = dailyList[Math.min(7, dailyList.length - 1)];
    const day14Item = dailyList[Math.min(14, dailyList.length - 1)];
    const endHorizonItem = dailyList[dailyList.length - 1];

    // Calculate End of Month forecast specifically
    const endOfMonthBal = currentTotalCash - (monthStats.daysRemainingInMonth * effectiveDailyExpense) + (monthStats.daysRemainingInMonth * effectiveDailyIncome);

    // Calculate Cash Runway (Days until cash hits Rp 0 without income)
    const dailyNetBurn = effectiveDailyExpense > 0 ? effectiveDailyExpense : 1;
    const runwayDays = currentTotalCash > 0 ? Math.floor(currentTotalCash / dailyNetBurn) : 0;

    // Lowest forecasted balance in horizon
    const lowestItem = dailyList.reduce(
      (min, item) => (item.endingBalance < min.endingBalance ? item : min),
      dailyList[0]
    );

    return {
      dailyList,
      tomorrowBalance: tomorrowItem.endingBalance,
      day7Balance: day7Item.endingBalance,
      day14Balance: day14Item.endingBalance,
      endHorizonBalance: endHorizonItem.endingBalance,
      endOfMonthBalance: endOfMonthBal,
      runwayDays,
      lowestItem,
      hasDeficitRisk: dailyList.some((d) => d.isBelowZero),
      hasLowBufferRisk: dailyList.some((d) => d.isBelowBuffer),
    };
  }, [
    currentTotalCash,
    effectiveDailyExpense,
    effectiveDailyIncome,
    horizonDays,
    includeDebts,
    debts,
    monthStats.daysRemainingInMonth,
  ]);

  // SVG Chart Calculations for Projection Curve
  const chartPoints = useMemo(() => {
    const list = forecastData.dailyList;
    if (list.length === 0) return { pathD: '', areaD: '', points: [], minBal: 0, maxBal: 1 };

    const values = list.map((d) => d.endingBalance);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(...values, currentTotalCash, 1000000);
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 160;
    const padding = 20;

    const points = list.map((d, idx) => {
      const x = padding + (idx / (list.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.endingBalance - minVal) / range) * (height - 2 * padding);
      return { x, y, data: d, idx };
    });

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const zeroY = height - padding - ((0 - minVal) / range) * (height - 2 * padding);
    const areaD = `${pathD} L ${lastPt.x},${height - padding} L ${firstPt.x},${height - padding} Z`;

    return {
      pathD,
      areaD,
      points,
      minBal: minVal,
      maxBal: maxVal,
      zeroY,
      width,
      height,
    };
  }, [forecastData.dailyList, currentTotalCash]);

  const activeHoveredDay = hoveredDayIndex !== null ? forecastData.dailyList[hoveredDayIndex] : null;

  return (
    <div className="fintech-card rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/5 via-transparent to-transparent pointer-events-none rounded-full blur-3xl"></div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Perkiraan Sisa Kas Harian
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Live Forecast
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Proyeksi saldo kas berjalan berdasarkan rata-rata pengeluaran dan pemasukan harian
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizon Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <button
              onClick={() => setHorizonDays(7)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                horizonDays === 7
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setHorizonDays(14)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                horizonDays === 14
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              14 Hari
            </button>
            <button
              onClick={() => setHorizonDays(30)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                horizonDays === 30
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setHorizonDays(monthStats.daysRemainingInMonth || 1)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                horizonDays === (monthStats.daysRemainingInMonth || 1)
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Akhir Bulan ({monthStats.daysRemainingInMonth}h)
            </button>
          </div>

          {/* Custom Simulation Toggle */}
          <button
            onClick={() => setIsCustomSimMode(!isCustomSimMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isCustomSimMode
                ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isCustomSimMode ? 'Simulasi Aktif' : 'Atur Simulasi'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulation Drawer (if opened) */}
      {isCustomSimMode && (
        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/80 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Simulasi Parameter Pengeluaran & Pemasukan Harian
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCustomDailyExpense(historicalAverages.avgDailyExpense);
                  setCustomDailyIncome(historicalAverages.avgDailyIncome);
                }}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset ke Rata-rata Riil
              </button>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDebts}
                  onChange={(e) => setIncludeDebts(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Sertakan Tagihan/Cicilan</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Daily Expense Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Estimasi Belanja Harian (Daily Burn):
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatMoney(customDailyExpense)} / hari
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(300000, historicalAverages.avgDailyExpense * 3)}
                step={5000}
                value={customDailyExpense}
                onChange={(e) => setCustomDailyExpense(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>Rp 0 (Hemat Total)</span>
                <span>Rata-rata Riil: {formatMoney(historicalAverages.avgDailyExpense, true)}</span>
                <span>{formatMoney(Math.max(300000, historicalAverages.avgDailyExpense * 3), true)}</span>
              </div>
            </div>

            {/* Daily Income Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Estimasi Pemasukan Harian:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(customDailyIncome)} / hari
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(500000, historicalAverages.avgDailyIncome * 3)}
                step={10000}
                value={customDailyIncome}
                onChange={(e) => setCustomDailyIncome(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>Rp 0</span>
                <span>Rata-rata Riil: {formatMoney(historicalAverages.avgDailyIncome, true)}</span>
                <span>{formatMoney(Math.max(500000, historicalAverages.avgDailyIncome * 3), true)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Multi-Horizon KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* Card 1: Saldo Kas Riil Saat Ini */}
        <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kas Riil Saat Ini
            </span>
            <Wallet className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {formatMoney(currentTotalCash)}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Titik awal proyeksi harian
            </div>
          </div>
        </div>

        {/* Card 2: Pengeluaran Harian (Daily Burn) */}
        <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Pola Belanja Harian
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              ~{formatMoney(effectiveDailyExpense, true)}/hari
            </div>
            <div className="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-semibold mt-0.5">
              {isCustomSimMode ? 'Simulasi aktif' : 'Rata-rata 30 hari riil'}
            </div>
          </div>
        </div>

        {/* Card 3: Proyeksi Sisa Kas +7 Hari */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Kas +7 Hari ke Depan
            </span>
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div
              className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
                forecastData.day7Balance >= 0
                  ? 'text-indigo-950 dark:text-indigo-200'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(forecastData.day7Balance)}
            </div>
            <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-semibold mt-0.5 flex items-center gap-1">
              <span>{forecastData.day7Balance >= currentTotalCash ? '📈 Bertambah' : '📉 Berkurang'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Proyeksi Akhir Bulan & Runway */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Estimasi Akhir {monthStats.monthName}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div
              className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
                forecastData.endOfMonthBalance >= 0
                  ? 'text-emerald-950 dark:text-emerald-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(forecastData.endOfMonthBalance)}
            </div>
            <div className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 font-semibold mt-0.5">
              Ketahanan: ~{forecastData.runwayDays} hari
            </div>
          </div>
        </div>
      </div>

      {/* Safety Alert (if cash falls below threshold or negative in horizon) */}
      {forecastData.hasDeficitRisk && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Peringatan Defisit Kas Terdeteksi:</span> Berdasarkan pola belanja harian dan kewajiban tagihan, saldo kas diproyeksikan berada di bawah Rp 0 pada tanggal{' '}
            <strong>{forecastData.lowestItem.dayDateFormatted} ({formatMoney(forecastData.lowestItem.endingBalance)})</strong>. Pertimbangkan untuk mengurangi pengeluaran atau menyiapkan dana darurat.
          </div>
        </div>
      )}

      {/* View Mode Tabs: Kurva Visual vs Tabel Hari-ke-Hari */}
      <div className="mt-5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Kurva Proyeksi ({horizonDays} Hari)
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'breakdown'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tabel Rincian Harian
          </button>
        </div>

        {/* Hovered Day Status Summary */}
        {activeHoveredDay && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">{activeHoveredDay.dayDateFormatted}:</span>
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
              Sisa Kas: {formatMoney(activeHoveredDay.endingBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Tab 1: Interactive Projection SVG Area Chart */}
      {activeTab === 'overview' && (
        <div className="mt-4">
          <div className="relative w-full h-44 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-end">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="cashForecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Zero line reference if applicable */}
              {chartPoints.minBal < 0 && (
                <line
                  x1="20"
                  y1={chartPoints.zeroY}
                  x2={chartPoints.width - 20}
                  y2={chartPoints.zeroY}
                  stroke="#F43F5E"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
              )}

              {/* Area */}
              <path d={chartPoints.areaD} fill="url(#cashForecastGrad)" />

              {/* Line */}
              <path
                d={chartPoints.pathD}
                fill="none"
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {chartPoints.points.map((pt) => {
                const isHovered = hoveredDayIndex === pt.idx;
                const isLowest = pt.data.dateStr === forecastData.lowestItem.dateStr;
                const isNegative = pt.data.endingBalance < 0;

                return (
                  <g
                    key={`fc-pt-${pt.idx}`}
                    onMouseEnter={() => setHoveredDayIndex(pt.idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Invisible larger hit area for easy hover */}
                    <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                    
                    {/* Visual dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isLowest ? 5 : 3.5}
                      fill={isNegative ? '#F43F5E' : isLowest ? '#F59E0B' : isHovered ? '#4F46E5' : '#6366F1'}
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="transition-all"
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Date Labels */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-3 pt-2 border-t border-slate-200/50 dark:border-slate-800">
              <span>Hari Ini ({forecastData.dailyList[0]?.dayDateFormatted})</span>
              <span>+7 Hari ({forecastData.dailyList[Math.min(7, forecastData.dailyList.length - 1)]?.dayDateFormatted})</span>
              {forecastData.dailyList.length > 14 && (
                <span>+14 Hari ({forecastData.dailyList[Math.min(14, forecastData.dailyList.length - 1)]?.dayDateFormatted})</span>
              )}
              <span>Akhir Periode ({forecastData.dailyList[forecastData.dailyList.length - 1]?.dayDateFormatted})</span>
            </div>
          </div>

          {/* Quick Snapshot Cards underneath chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
            {forecastData.dailyList.slice(0, 4).map((d) => (
              <div
                key={`mini-card-${d.dateStr}`}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>{d.isToday ? 'Hari Ini' : `${d.dayName}, ${d.dayDateFormatted}`}</span>
                  {d.duePayablesTotal > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-md font-bold">
                      Tagihan
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <div className={`font-mono font-bold text-sm ${d.endingBalance < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                    {formatMoney(d.endingBalance, true)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {d.netChange >= 0 ? `+${formatMoney(d.netChange, true)}` : `-${formatMoney(Math.abs(d.netChange), true)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Day-by-Day Breakdown Table */}
      {activeTab === 'breakdown' && (
        <div className="mt-4 overflow-x-auto max-h-72 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5">Tanggal</th>
                <th className="px-3.5 py-2.5">Saldo Awal</th>
                <th className="px-3.5 py-2.5">Pemasukan (+)</th>
                <th className="px-3.5 py-2.5">Pengeluaran (-)</th>
                <th className="px-3.5 py-2.5">Kewajiban / Cicilan</th>
                <th className="px-3.5 py-2.5">Perkiraan Sisa Kas</th>
                <th className="px-3.5 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {forecastData.dailyList.map((row) => {
                const isSelected = hoveredDayIndex === row.dayIndex;

                return (
                  <tr
                    key={`table-row-${row.dateStr}`}
                    onMouseEnter={() => setHoveredDayIndex(row.dayIndex)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40'
                        : row.isToday
                        ? 'bg-slate-50/80 dark:bg-slate-900/30'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/20'
                    }`}
                  >
                    <td className="px-3.5 py-2 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {row.isToday ? 'Hari Ini' : row.dayDateFormatted}
                        </span>
                        <span className="text-[10px] text-slate-400">({row.dayName})</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatMoney(row.startingBalance, true)}
                    </td>

                    <td className="px-3.5 py-2 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {row.projectedIncome > 0 ? `+${formatMoney(row.projectedIncome, true)}` : '-'}
                    </td>

                    <td className="px-3.5 py-2 font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {row.projectedExpense > 0 ? `-${formatMoney(row.projectedExpense, true)}` : '-'}
                    </td>

                    <td className="px-3.5 py-2 whitespace-nowrap">
                      {row.duePayablesList.length > 0 ? (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>{(row.duePayablesList[0]?.itemName || row.duePayablesList[0]?.title || row.duePayablesList[0]?.personName || 'Tagihan')} ({formatMoney(row.duePayablesTotal, true)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-3.5 py-2 font-mono font-bold whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          row.endingBalance < 0
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : row.endingBalance < 500000
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {formatMoney(row.endingBalance)}
                      </span>
                    </td>

                    <td className="px-3.5 py-2 text-center whitespace-nowrap">
                      {onOpenNewTransaction && (
                        <button
                          onClick={() => onOpenNewTransaction(row.dateStr)}
                          title="Catat transaksi pada tanggal ini"
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
