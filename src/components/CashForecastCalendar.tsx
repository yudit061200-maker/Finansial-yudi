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
  formatDateFull,
  formatDateToYMD,
  getTodayDateString,
  isDebtPaid,
} from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sparkles,
  Filter,
  Layers,
  CreditCard,
  HandCoins,
  Receipt,
  Plus,
  X,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface CashForecastCalendarProps {
  accounts: Account[];
  transactions: Transaction[];
  debts?: DebtRecord[];
  budgets?: Budget[];
  isPrivacyMode?: boolean;
  onOpenNewTransaction?: (defaultDate?: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onNavigateToDebts?: () => void;
}

interface DayCashData {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ...
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;

  // Actuals
  actualTransactions: Transaction[];
  actualIncome: number;
  actualExpense: number;
  actualNetFlow: number;

  // Forecast & Debts
  duePayables: DebtRecord[]; // Hutang / Cicilan jatuh tempo
  dueReceivables: DebtRecord[]; // Piutang jatuh tempo
  duePayablesAmount: number;
  dueReceivablesAmount: number;
  estimatedDailyExpense: number;

  // Balances
  projectedNetFlow: number;
  endOfDayCashBalance: number;
  isLowestBalanceMonthDay?: boolean;
}

export const CashForecastCalendar: React.FC<CashForecastCalendarProps> = ({
  accounts,
  transactions,
  debts = [],
  budgets = [],
  isPrivacyMode = false,
  onOpenNewTransaction,
  onSelectTransaction,
  onNavigateToDebts,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed: 0 = Jan, 8 = Sep
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(getTodayDateString());
  const [includeBurnRate, setIncludeBurnRate] = useState<boolean>(true);
  const [activeViewMode, setActiveViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterFlow, setFilterFlow] = useState<'all' | 'income' | 'expense' | 'due'>('all');
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Helper for masking amounts if privacy mode is on
  const formatMoney = (amount: number, isShort = false) => {
    if (isPrivacyMode) {
      return 'Rp ••••••••';
    }
    return isShort ? formatRupiahShort(amount) : formatRupiah(amount);
  };

  // Current Total Net Cash across all accounts right now
  const totalActualCashNow = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  // Average Daily Expense Burn Rate (from actual expenses in the last 30 days)
  const avgDailyBurnRate = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

    const recentExpenses = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      const tTime = new Date(t.date).getTime();
      return !isNaN(tTime) && tTime >= thirtyDaysAgoTime && tTime <= today.getTime();
    });

    const totalRecentExpense = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
    return Math.round(totalRecentExpense / 30) || 0;
  }, [transactions, today]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Month and Year Label
  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  // Build Calendar Matrix with Actuals & Projections
  const calendarData = useMemo(() => {
    // 1. First, group all transactions by date key (YYYY-MM-DD)
    const txByDateMap = new Map<string, Transaction[]>();
    transactions.forEach((tx) => {
      const dateKey = tx.date ? tx.date.split('T')[0] : '';
      if (!dateKey) return;
      if (!txByDateMap.has(dateKey)) {
        txByDateMap.set(dateKey, []);
      }
      txByDateMap.get(dateKey)!.push(tx);
    });

    // 2. Group active debts / due dates by day-of-month or specific dueDate
    const duePayablesByDate = new Map<string, DebtRecord[]>();
    const dueReceivablesByDate = new Map<string, DebtRecord[]>();

    debts.forEach((debt) => {
      if (isDebtPaid(debt)) return;

      // If debt has an exact dueDate YYYY-MM-DD
      if (debt.dueDate) {
        const dKey = debt.dueDate.split('T')[0];
        if (debt.type === 'receivable') {
          if (!dueReceivablesByDate.has(dKey)) dueReceivablesByDate.set(dKey, []);
          dueReceivablesByDate.get(dKey)!.push(debt);
        } else {
          if (!duePayablesByDate.has(dKey)) duePayablesByDate.set(dKey, []);
          duePayablesByDate.get(dKey)!.push(debt);
        }
      }

      // If it's a monthly installment with dueDayOfMonth (e.g. tanggal 5, 10, 25)
      if (debt.isInstallment && debt.dueDayOfMonth) {
        const padMonth = String(currentMonth + 1).padStart(2, '0');
        const padDay = String(Math.min(28, debt.dueDayOfMonth)).padStart(2, '0');
        const recurringKey = `${currentYear}-${padMonth}-${padDay}`;

        if (!duePayablesByDate.has(recurringKey)) duePayablesByDate.set(recurringKey, []);
        // Avoid duplicate if dueDate matched already
        if (!duePayablesByDate.get(recurringKey)!.some((d) => d.id === debt.id)) {
          duePayablesByDate.get(recurringKey)!.push(debt);
        }
      }
    });

    // 3. Generate Calendar Days (including leading and trailing days from adjacent months)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Start with Monday as 0 or Sunday as 0 (Indonesian standard: Senin - Minggu)
    // getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    let startDayOfWeek = firstDayOfMonth.getDay(); // 0-6
    // Shift so Monday = 0, Sunday = 6
    const startOffset = (startDayOfWeek + 6) % 7;

    const daysList: DayCashData[] = [];

    // Leading days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(currentYear, currentMonth - 1, pDay);
      const pDateStr = formatDateToYMD(pDate);
      daysList.push({
        date: pDate,
        dateStr: pDateStr,
        dayNumber: pDay,
        dayOfWeek: pDate.getDay(),
        isCurrentMonth: false,
        isToday: pDateStr === todayStr,
        isPast: pDateStr < todayStr,
        isFuture: pDateStr > todayStr,
        actualTransactions: txByDateMap.get(pDateStr) || [],
        actualIncome: 0,
        actualExpense: 0,
        actualNetFlow: 0,
        duePayables: duePayablesByDate.get(pDateStr) || [],
        dueReceivables: dueReceivablesByDate.get(pDateStr) || [],
        duePayablesAmount: 0,
        dueReceivablesAmount: 0,
        estimatedDailyExpense: 0,
        projectedNetFlow: 0,
        endOfDayCashBalance: 0,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(currentYear, currentMonth, d);
      const cDateStr = formatDateToYMD(cDate);
      const isToday = cDateStr === todayStr;
      const isPast = cDateStr < todayStr;
      const isFuture = cDateStr > todayStr;

      const dayTxs = txByDateMap.get(cDateStr) || [];
      const actualIncome = dayTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const actualExpense = dayTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const actualNetFlow = actualIncome - actualExpense;

      const payables = duePayablesByDate.get(cDateStr) || [];
      const receivables = dueReceivablesByDate.get(cDateStr) || [];

      const duePayablesAmount = payables.reduce((sum, d) => {
        const installmentAmt = d.monthlyInstallment || d.remainingAmount;
        return sum + Math.min(installmentAmt, d.remainingAmount);
      }, 0);

      const dueReceivablesAmount = receivables.reduce((sum, d) => sum + d.remainingAmount, 0);

      // Estimated daily expense (if future and enabled)
      const estExpense = isFuture && includeBurnRate ? avgDailyBurnRate : 0;

      daysList.push({
        date: cDate,
        dateStr: cDateStr,
        dayNumber: d,
        dayOfWeek: cDate.getDay(),
        isCurrentMonth: true,
        isToday,
        isPast,
        isFuture,
        actualTransactions: dayTxs,
        actualIncome,
        actualExpense,
        actualNetFlow,
        duePayables: payables,
        dueReceivables: receivables,
        duePayablesAmount,
        dueReceivablesAmount,
        estimatedDailyExpense: estExpense,
        projectedNetFlow: actualNetFlow - (isFuture ? duePayablesAmount + estExpense : 0) + (isFuture ? dueReceivablesAmount : 0),
        endOfDayCashBalance: 0, // Will be computed in chronological pass below
      });
    }

    // Trailing days from next month to complete 35 or 42 grid cells
    const remainingCells = (7 - (daysList.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nDate = new Date(currentYear, currentMonth + 1, n);
      const nDateStr = formatDateToYMD(nDate);
      daysList.push({
        date: nDate,
        dateStr: nDateStr,
        dayNumber: n,
        dayOfWeek: nDate.getDay(),
        isCurrentMonth: false,
        isToday: nDateStr === todayStr,
        isPast: nDateStr < todayStr,
        isFuture: nDateStr > todayStr,
        actualTransactions: txByDateMap.get(nDateStr) || [],
        actualIncome: 0,
        actualExpense: 0,
        actualNetFlow: 0,
        duePayables: duePayablesByDate.get(nDateStr) || [],
        dueReceivables: dueReceivablesByDate.get(nDateStr) || [],
        duePayablesAmount: 0,
        dueReceivablesAmount: 0,
        estimatedDailyExpense: 0,
        projectedNetFlow: 0,
        endOfDayCashBalance: 0,
      });
    }

    // 4. Compute Cumulative Running Balance Timeline:
    // Today's balance is totalActualCashNow.
    // Backward pass for past days:
    // Balance(Day-1) = Balance(Day) - Incomes(Day) + Expenses(Day)
    // Forward pass for future days:
    // Balance(Day+1) = Balance(Day) + Incomes(Day+1) - (Expenses + DueBills + BurnRate)(Day+1)

    // Sort all transactions chronologically to calculate absolute running balance accurately
    const sortedAllTxs = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Build absolute daily balance map for past and today
    // Map: dateStr -> actual end of day balance
    const dateToBalanceMap = new Map<string, number>();
    
    // If we have totalActualCashNow as today's balance, we calculate backward from today
    let runningBackwards = totalActualCashNow;
    
    // Find index of today in calendar or anchor by today
    const currentMonthDays = daysList.filter((d) => d.isCurrentMonth);

    // Let's find today's position
    const todayIndex = currentMonthDays.findIndex((d) => d.isToday);

    if (todayIndex !== -1) {
      // Current month contains today!
      // Set today's balance
      currentMonthDays[todayIndex].endOfDayCashBalance = totalActualCashNow;

      // Backward from today
      let prevBal = totalActualCashNow;
      for (let i = todayIndex - 1; i >= 0; i--) {
        const nextDay = currentMonthDays[i + 1];
        // prevDayBalance = nextDayBalance - nextDayIncome + nextDayExpense
        prevBal = prevBal - nextDay.actualIncome + nextDay.actualExpense;
        currentMonthDays[i].endOfDayCashBalance = prevBal;
      }

      // Forward from today into future
      let forwardBal = totalActualCashNow;
      for (let i = todayIndex + 1; i < currentMonthDays.length; i++) {
        const day = currentMonthDays[i];
        const netChange = day.actualIncome + day.dueReceivablesAmount - day.actualExpense - day.duePayablesAmount - day.estimatedDailyExpense;
        forwardBal += netChange;
        day.endOfDayCashBalance = forwardBal;
      }
    } else {
      // Month is either entirely in the past or entirely in the future
      const monthFirstDate = new Date(currentYear, currentMonth, 1);
      if (monthFirstDate < today) {
        // Month in past: calculate from totalActualCashNow back to that month
        // Or calculate forward from the beginning
        let bal = totalActualCashNow;
        // Collect all transactions between that month end and today to subtract/add
        const txsAfter = transactions.filter((t) => new Date(t.date) > lastDayOfMonth);
        const incomeAfter = txsAfter.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenseAfter = txsAfter.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        let endOfMonthBalance = bal - incomeAfter + expenseAfter;

        for (let i = currentMonthDays.length - 1; i >= 0; i--) {
          currentMonthDays[i].endOfDayCashBalance = endOfMonthBalance;
          endOfMonthBalance = endOfMonthBalance - currentMonthDays[i].actualIncome + currentMonthDays[i].actualExpense;
        }
      } else {
        // Month in future: project forward from today
        // Calculate forward from today's balance to the start of this future month
        let forwardBal = totalActualCashNow;
        // Project day by day from today to future month
        const daysDiff = Math.ceil((monthFirstDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        // Add rough burn rate & intermediate debts
        if (includeBurnRate) {
          forwardBal -= (daysDiff * avgDailyBurnRate);
        }

        for (let i = 0; i < currentMonthDays.length; i++) {
          const day = currentMonthDays[i];
          const netChange = day.actualIncome + day.dueReceivablesAmount - day.actualExpense - day.duePayablesAmount - day.estimatedDailyExpense;
          forwardBal += netChange;
          day.endOfDayCashBalance = forwardBal;
        }
      }
    }

    // Identify Lowest Balance Day in the current month (Titik Kritis Kas)
    let lowestBalance = Infinity;
    let lowestDayIndex = -1;
    currentMonthDays.forEach((d, idx) => {
      if (d.endOfDayCashBalance < lowestBalance) {
        lowestBalance = d.endOfDayCashBalance;
        lowestDayIndex = idx;
      }
    });

    if (lowestDayIndex !== -1 && currentMonthDays[lowestDayIndex]) {
      currentMonthDays[lowestDayIndex].isLowestBalanceMonthDay = true;
    }

    return {
      daysList,
      currentMonthDays,
      lowestBalance,
      lowestDay: lowestDayIndex !== -1 ? currentMonthDays[lowestDayIndex] : null,
    };
  }, [
    currentYear,
    currentMonth,
    transactions,
    debts,
    today,
    todayStr,
    totalActualCashNow,
    includeBurnRate,
    avgDailyBurnRate,
  ]);

  // Selected Day Details
  const selectedDayData = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarData.daysList.find((d) => d.dateStr === selectedDateStr) || null;
  }, [selectedDateStr, calendarData.daysList]);

  // Summary Metrics for the current month
  const monthSummary = useMemo(() => {
    const days = calendarData.currentMonthDays;
    if (!days || days.length === 0) {
      return {
        startBalance: totalActualCashNow,
        projectedEndBalance: totalActualCashNow,
        totalIncomeMonth: 0,
        totalExpenseMonth: 0,
        totalDuePayablesMonth: 0,
        totalDueReceivablesMonth: 0,
        netMonthChange: 0,
        isDeficit: false,
      };
    }

    const startBalance = days[0]?.endOfDayCashBalance || totalActualCashNow;
    const projectedEndBalance = days[days.length - 1]?.endOfDayCashBalance || totalActualCashNow;

    const totalIncomeMonth = days.reduce((sum, d) => sum + d.actualIncome, 0);
    const totalExpenseMonth = days.reduce((sum, d) => sum + d.actualExpense, 0);
    const totalDuePayablesMonth = days.reduce((sum, d) => sum + d.duePayablesAmount, 0);
    const totalDueReceivablesMonth = days.reduce((sum, d) => sum + d.dueReceivablesAmount, 0);
    const totalEstimatedBurn = days.reduce((sum, d) => sum + d.estimatedDailyExpense, 0);

    const netMonthChange = projectedEndBalance - startBalance;

    return {
      startBalance,
      projectedEndBalance,
      totalIncomeMonth,
      totalExpenseMonth,
      totalDuePayablesMonth,
      totalDueReceivablesMonth,
      totalEstimatedBurn,
      netMonthChange,
      isDeficit: projectedEndBalance < 0 || netMonthChange < 0,
    };
  }, [calendarData.currentMonthDays, totalActualCashNow]);

  const weekDayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="fintech-card rounded-3xl p-5 sm:p-6.5 transition-all space-y-6">
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Proyeksi Likuiditas & Sisa Kas
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Data Riil Aktual
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
            Kalender Perkiraan Sisa Kas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl mt-0.5">
            Pantau posisi saldo kas akhir hari secara harian, lengkap dengan pencatatan mutasi aktual, jadwal jatuh tempo hutang/cicilan, dan estimasi daya tahan kas.
          </p>
        </div>

        {/* Month Navigator & Mode Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Month Controller */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black text-slate-900 dark:text-white min-w-[125px] text-center capitalize">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Today button */}
          <button
            onClick={handleJumpToToday}
            className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-all cursor-pointer"
          >
            Hari Ini
          </button>

          {/* Burn rate toggle */}
          <button
            onClick={() => setIncludeBurnRate((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              includeBurnRate
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title="Sertakan estimasi biaya hidup harian (~"
          >
            <Flame className={`w-3.5 h-3.5 ${includeBurnRate ? 'text-amber-600 dark:text-amber-400 fill-amber-500/20' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Burn Rate Harian:</span>
            <span>{includeBurnRate ? formatMoney(avgDailyBurnRate, true) + '/hari' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Month Financial Health Banner & Insights */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Saldo Awal vs Akhir Bulan */}
        <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Proyeksi Akhir Bulan
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-lg sm:text-xl font-black font-mono tracking-tight tabular-nums ${
              monthSummary.projectedEndBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatMoney(monthSummary.projectedEndBalance)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Awal: {formatMoney(monthSummary.startBalance, true)}</span>
              <span>→</span>
              <span className={monthSummary.netMonthChange >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                {monthSummary.netMonthChange >= 0 ? '+' : ''}{formatMoney(monthSummary.netMonthChange, true)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Pemasukan Bulan Ini */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Inflow Kas
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-emerald-950 dark:text-emerald-300 tabular-nums">
              +{formatMoney(monthSummary.totalIncomeMonth + monthSummary.totalDueReceivablesMonth)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
              Aktual: {formatMoney(monthSummary.totalIncomeMonth, true)}
              {monthSummary.totalDueReceivablesMonth > 0 && ` + Piutang: ${formatMoney(monthSummary.totalDueReceivablesMonth, true)}`}
            </div>
          </div>
        </div>

        {/* Metric 3: Pengeluaran & Tagihan */}
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Outflow & Tagihan
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatMoney(monthSummary.totalExpenseMonth + monthSummary.totalDuePayablesMonth + (includeBurnRate ? monthSummary.totalEstimatedBurn : 0))}
            </div>
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 mt-1 truncate">
              Aktual: {formatMoney(monthSummary.totalExpenseMonth, true)}
              {monthSummary.totalDuePayablesMonth > 0 && ` + Tagihan: ${formatMoney(monthSummary.totalDuePayablesMonth, true)}`}
            </div>
          </div>
        </div>

        {/* Metric 4: Titik Kritis Kas Terendah */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              Titik Kas Terendah
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-amber-900 dark:text-amber-300 tabular-nums">
              {calendarData.lowestDay ? formatMoney(calendarData.lowestDay.endOfDayCashBalance) : 'Rp 0'}
            </div>
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{calendarData.lowestDay ? formatDateIndo(calendarData.lowestDay.dateStr) : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Calendar Grid Representation */}
      <div className="space-y-2">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1">
          {weekDayLabels.map((day, idx) => (
            <div key={day} className={idx >= 5 ? 'text-rose-500 dark:text-rose-400' : ''}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarData.daysList.map((day, cellIdx) => {
            const isSelected = selectedDateStr === day.dateStr;
            const hasActivity = day.actualTransactions.length > 0 || day.duePayables.length > 0 || day.dueReceivables.length > 0;
            const isPositiveEnd = day.endOfDayCashBalance >= 0;
            const isCriticalLow = day.endOfDayCashBalance < 500000;

            return (
              <div
                key={`cash-cell-${day.dateStr}-${cellIdx}`}
                onClick={() => {
                  setSelectedDateStr(day.dateStr);
                  setDetailModalOpen(true);
                }}
                className={`min-h-[86px] sm:min-h-[102px] p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group select-none ${
                  !day.isCurrentMonth
                    ? 'opacity-35 bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 text-slate-400'
                    : day.isToday
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/30 shadow-xs'
                    : isSelected
                    ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-400/20'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 shadow-2xs'
                }`}
              >
                {/* Cell Header: Day Number + Status Dots */}
                <div className="flex items-start justify-between">
                  <span
                    className={`text-xs sm:text-sm font-black font-mono leading-none ${
                      day.isToday
                        ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-200/60 dark:bg-indigo-800/80 px-1.5 py-0.5 rounded-lg'
                        : day.isCurrentMonth
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Badges / Dots */}
                  <div className="flex items-center gap-1">
                    {day.duePayables.length > 0 && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-500 ring-1 ring-white dark:ring-slate-900"
                        title={`${day.duePayables.length} Tagihan / Cicilan Jatuh Tempo`}
                      />
                    )}
                    {day.dueReceivables.length > 0 && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 ring-1 ring-white dark:ring-slate-900"
                        title={`${day.dueReceivables.length} Piutang Masuk`}
                      />
                    )}
                    {day.actualTransactions.length > 0 && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900"
                        title={`${day.actualTransactions.length} Transaksi Aktual`}
                      />
                    )}
                    {day.isLowestBalanceMonthDay && day.isCurrentMonth && (
                      <span
                        className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-1 py-0.2 rounded-md leading-none"
                        title="Titik Sisa Kas Terendah Bulan Ini"
                      >
                        Min
                      </span>
                    )}
                  </div>
                </div>

                {/* Daily Inflow / Outflow pill if any */}
                <div className="my-1 space-y-0.5 min-h-[22px]">
                  {day.actualIncome > 0 && (
                    <div className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate leading-tight font-mono">
                      +{formatMoney(day.actualIncome, true)}
                    </div>
                  )}
                  {day.actualExpense > 0 && (
                    <div className="text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 truncate leading-tight font-mono">
                      -{formatMoney(day.actualExpense, true)}
                    </div>
                  )}
                  {day.actualTransactions.length === 0 && day.duePayablesAmount > 0 && (
                    <div className="text-[9px] sm:text-[10px] font-bold text-rose-700 dark:text-rose-300 truncate leading-tight font-mono bg-rose-50 dark:bg-rose-950/60 px-1 py-0.2 rounded">
                      Tagihan: -{formatMoney(day.duePayablesAmount, true)}
                    </div>
                  )}
                </div>

                {/* End-of-day Cash Balance */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                  <div className="text-[9px] text-slate-400 font-semibold truncate leading-tight">
                    Sisa Kas:
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs font-black font-mono truncate tracking-tight tabular-nums ${
                      !isPositiveEnd
                        ? 'text-rose-600 dark:text-rose-400'
                        : isCriticalLow
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {formatMoney(day.endOfDayCashBalance, true)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Legend & Quick Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Pemasukan / Transaksi Aktual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Tagihan & Cicilan Jatuh Tempo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Hari Ini</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNewTransaction && (
            <button
              onClick={() => onOpenNewTransaction(selectedDateStr || todayStr)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Catat di Tanggal Terpilih</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Interactive Day Detail Modal / Slide-over */}
      {detailModalOpen && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {selectedDayData.isPast ? 'Tanggal Lampau' : selectedDayData.isToday ? 'Hari Ini' : 'Proyeksi Masa Depan'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedDayData.dateStr}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                  Rincian Sisa Kas & Aktivitas: {formatDateFull(selectedDayData.dateStr)}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* End of Day Cash KPI */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                  Perkiraan Saldo Sisa Kas Akhir Hari
                </span>
                <div className="text-2xl font-black font-mono tracking-tight mt-1 text-white tabular-nums">
                  {formatMoney(selectedDayData.endOfDayCashBalance)}
                </div>
                <span className="text-xs text-slate-300 mt-1 block">
                  {selectedDayData.isPast ? 'Status: Terkunci (Aktual)' : 'Status: Estimasi Berdasarkan Mutasi & Tagihan'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                <Wallet className="w-6 h-6 text-indigo-300" />
              </div>
            </div>

            {/* Actual Transactions on this day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-500" />
                  Transaksi Aktual Terdaftar ({selectedDayData.actualTransactions.length})
                </span>
                {selectedDayData.actualTransactions.length > 0 && (
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    Net: {selectedDayData.actualNetFlow >= 0 ? '+' : ''}{formatMoney(selectedDayData.actualNetFlow)}
                  </span>
                )}
              </div>

              {selectedDayData.actualTransactions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 text-center text-xs text-slate-400">
                  Tidak ada transaksi tercatat di tanggal ini
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayData.actualTransactions.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';
                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          onSelectTransaction?.(tx);
                          setDetailModalOpen(false);
                        }}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isExpense
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                                : isIncome
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
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
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tx.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tx.category} • {tx.paymentMethod || 'Kas'}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-black font-mono tabular-nums shrink-0 ml-2 ${
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Debts & Installments due on this day */}
            {(selectedDayData.duePayables.length > 0 || selectedDayData.dueReceivables.length > 0) && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  Jatuh Tempo Hutang, Cicilan & Piutang ({selectedDayData.duePayables.length + selectedDayData.dueReceivables.length})
                </span>

                <div className="space-y-2">
                  {selectedDayData.duePayables.map((debt) => (
                    <div
                      key={debt.id}
                      className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-rose-950 dark:text-rose-200 truncate">
                          {debt.title} ({debt.personName})
                        </div>
                        <div className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold">
                          {debt.isInstallment ? 'Cicilan Bulanan' : 'Hutang Pinjaman'} • Jatuh Tempo
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                          -{formatMoney(debt.monthlyInstallment || debt.remainingAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Sisa Total: {formatMoney(debt.remainingAmount, true)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedDayData.dueReceivables.map((debt) => (
                    <div
                      key={debt.id}
                      className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-200 truncate">
                          {debt.title} ({debt.personName})
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold">
                          Piutang Akan Diterima
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(debt.remainingAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Daily Burn note */}
            {selectedDayData.isFuture && includeBurnRate && avgDailyBurnRate > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Termasuk alokasi perkiraan biaya hidup harian <strong>~{formatMoney(avgDailyBurnRate)}</strong> untuk menjaga akurasi proyeksi sisa kas.
                </span>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {onOpenNewTransaction && (
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    onOpenNewTransaction(selectedDayData.dateStr);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Transaksi Tanggal Ini</span>
                </button>
              )}
              {onNavigateToDebts && (selectedDayData.duePayables.length > 0 || selectedDayData.dueReceivables.length > 0) && (
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    onNavigateToDebts();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Buka Buku Hutang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
