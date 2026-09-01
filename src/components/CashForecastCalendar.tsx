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
  CreditCard,
  Receipt,
  Plus,
  X,
  ShieldCheck,
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

  // Actual registered transactions
  actualTransactions: Transaction[];
  actualIncome: number;
  actualExpense: number;
  actualNetFlow: number;

  // Real scheduled debts / installments due on this day
  duePayables: DebtRecord[];
  dueReceivables: DebtRecord[];
  duePayablesAmount: number;
  dueReceivablesAmount: number;

  // Pure real daily net & running balance
  dayNetFlow: number;
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

  // Build Calendar Matrix with 100% Real Actuals & Scheduled Installments (No Estimates/Burn Rate)
  const calendarData = useMemo(() => {
    // 1. Group all transactions by date key (YYYY-MM-DD)
    const txByDateMap = new Map<string, Transaction[]>();
    transactions.forEach((tx) => {
      const dateKey = tx.date ? tx.date.split('T')[0] : '';
      if (!dateKey) return;
      if (!txByDateMap.has(dateKey)) {
        txByDateMap.set(dateKey, []);
      }
      txByDateMap.get(dateKey)!.push(tx);
    });

    // Helper to extract active debts & installment items due on any specific date
    const getDueForDate = (dateStr: string, dateObj: Date) => {
      const dayOfMonth = dateObj.getDate();
      const matchingPayables: DebtRecord[] = [];
      const matchingReceivables: DebtRecord[] = [];

      debts.forEach((debt) => {
        if (isDebtPaid(debt)) return;

        let isDue = false;
        if (debt.dueDate && debt.dueDate.split('T')[0] === dateStr) {
          isDue = true;
        } else if (debt.isInstallment && debt.dueDayOfMonth && debt.dueDayOfMonth === dayOfMonth) {
          isDue = true;
        }

        if (isDue) {
          if (debt.type === 'receivable') {
            matchingReceivables.push(debt);
          } else {
            matchingPayables.push(debt);
          }
        }
      });

      const payablesAmount = matchingPayables.reduce((sum, d) => {
        const installmentAmt = d.monthlyInstallment || d.remainingAmount;
        return sum + Math.min(installmentAmt, d.remainingAmount);
      }, 0);

      const receivablesAmount = matchingReceivables.reduce((sum, d) => {
        const installmentAmt = d.monthlyInstallment || d.remainingAmount;
        return sum + Math.min(installmentAmt, d.remainingAmount);
      }, 0);

      return {
        payables: matchingPayables,
        receivables: matchingReceivables,
        payablesAmount,
        receivablesAmount,
      };
    };

    // 2. Generate Calendar Days (leading, current month, trailing)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Monday = 0, Sunday = 6
    const startDayOfWeek = firstDayOfMonth.getDay();
    const startOffset = (startDayOfWeek + 6) % 7;

    const daysList: DayCashData[] = [];

    // Leading days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(currentYear, currentMonth - 1, pDay);
      const pDateStr = formatDateToYMD(pDate);
      const dayTxs = txByDateMap.get(pDateStr) || [];
      const actualIncome = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const actualExpense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dueInfo = getDueForDate(pDateStr, pDate);

      daysList.push({
        date: pDate,
        dateStr: pDateStr,
        dayNumber: pDay,
        dayOfWeek: pDate.getDay(),
        isCurrentMonth: false,
        isToday: pDateStr === todayStr,
        isPast: pDateStr < todayStr,
        isFuture: pDateStr > todayStr,
        actualTransactions: dayTxs,
        actualIncome,
        actualExpense,
        actualNetFlow: actualIncome - actualExpense,
        duePayables: dueInfo.payables,
        dueReceivables: dueInfo.receivables,
        duePayablesAmount: dueInfo.payablesAmount,
        dueReceivablesAmount: dueInfo.receivablesAmount,
        dayNetFlow: actualIncome + dueInfo.receivablesAmount - actualExpense - dueInfo.payablesAmount,
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
      const actualIncome = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const actualExpense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dueInfo = getDueForDate(cDateStr, cDate);

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
        actualNetFlow: actualIncome - actualExpense,
        duePayables: dueInfo.payables,
        dueReceivables: dueInfo.receivables,
        duePayablesAmount: dueInfo.payablesAmount,
        dueReceivablesAmount: dueInfo.receivablesAmount,
        dayNetFlow: actualIncome + dueInfo.receivablesAmount - actualExpense - dueInfo.payablesAmount,
        endOfDayCashBalance: 0,
      });
    }

    // Trailing days from next month
    const remainingCells = (7 - (daysList.length % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nDate = new Date(currentYear, currentMonth + 1, n);
      const nDateStr = formatDateToYMD(nDate);
      const dayTxs = txByDateMap.get(nDateStr) || [];
      const actualIncome = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const actualExpense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dueInfo = getDueForDate(nDateStr, nDate);

      daysList.push({
        date: nDate,
        dateStr: nDateStr,
        dayNumber: n,
        dayOfWeek: nDate.getDay(),
        isCurrentMonth: false,
        isToday: nDateStr === todayStr,
        isPast: nDateStr < todayStr,
        isFuture: nDateStr > todayStr,
        actualTransactions: dayTxs,
        actualIncome,
        actualExpense,
        actualNetFlow: actualIncome - actualExpense,
        duePayables: dueInfo.payables,
        dueReceivables: dueInfo.receivables,
        duePayablesAmount: dueInfo.payablesAmount,
        dueReceivablesAmount: dueInfo.receivablesAmount,
        dayNetFlow: actualIncome + dueInfo.receivablesAmount - actualExpense - dueInfo.payablesAmount,
        endOfDayCashBalance: 0,
      });
    }

    // 3. Compute 100% Real Running Cash Balances Across All Days
    const todayIndex = daysList.findIndex((d) => d.isToday);

    if (todayIndex !== -1) {
      // Current calendar grid contains TODAY
      daysList[todayIndex].endOfDayCashBalance = totalActualCashNow;

      // Backward propagation for past days in grid:
      // prevDayBalance = nextDayBalance - nextDayActualIncome + nextDayActualExpense
      for (let i = todayIndex - 1; i >= 0; i--) {
        const nextDay = daysList[i + 1];
        daysList[i].endOfDayCashBalance =
          daysList[i + 1].endOfDayCashBalance - nextDay.actualIncome + nextDay.actualExpense;
      }

      // Forward propagation for future days in grid:
      // forwardDayBalance = prevDayBalance + actualIncome + dueReceivables - actualExpense - duePayables
      for (let i = todayIndex + 1; i < daysList.length; i++) {
        const current = daysList[i];
        const prev = daysList[i - 1];
        daysList[i].endOfDayCashBalance =
          prev.endOfDayCashBalance +
          current.actualIncome +
          current.dueReceivablesAmount -
          current.actualExpense -
          current.duePayablesAmount;
      }
    } else {
      // Month is entirely in the past or entirely in the future
      const firstGridDate = daysList[0].date;
      const lastGridDate = daysList[daysList.length - 1].date;

      if (lastGridDate < today) {
        // ENTIRELY PAST: Step backward from today's actual total cash balance
        // Collect all transactions occurred between the last day in grid and today
        const lastGridDateStr = daysList[daysList.length - 1].dateStr;
        const txsAfterGrid = transactions.filter((t) => {
          const tDateStr = t.date ? t.date.split('T')[0] : '';
          return tDateStr > lastGridDateStr && tDateStr <= todayStr;
        });
        const netAfterGrid = txsAfterGrid.reduce(
          (sum, t) => sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
          0
        );

        let runningBal = totalActualCashNow - netAfterGrid;
        daysList[daysList.length - 1].endOfDayCashBalance = runningBal;

        for (let i = daysList.length - 2; i >= 0; i--) {
          const nextDay = daysList[i + 1];
          daysList[i].endOfDayCashBalance =
            daysList[i + 1].endOfDayCashBalance - nextDay.actualIncome + nextDay.actualExpense;
        }
      } else {
        // ENTIRELY FUTURE: Step forward from today's actual cash balance through intervening days
        let runningBal = totalActualCashNow;
        const cursorDate = new Date(today);
        cursorDate.setDate(cursorDate.getDate() + 1);

        while (formatDateToYMD(cursorDate) < daysList[0].dateStr) {
          const cStr = formatDateToYMD(cursorDate);
          const cTxs = txByDateMap.get(cStr) || [];
          const cIncome = cTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const cExpense = cTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const cDue = getDueForDate(cStr, cursorDate);
          runningBal += cIncome + cDue.receivablesAmount - cExpense - cDue.payablesAmount;
          cursorDate.setDate(cursorDate.getDate() + 1);
        }

        // Now calculate for all grid days forward
        for (let i = 0; i < daysList.length; i++) {
          const current = daysList[i];
          runningBal +=
            current.actualIncome +
            current.dueReceivablesAmount -
            current.actualExpense -
            current.duePayablesAmount;
          current.endOfDayCashBalance = runningBal;
        }
      }
    }

    const currentMonthDays = daysList.filter((d) => d.isCurrentMonth);

    // Identify Lowest Balance Day in the current month (Titik Kas Terendah)
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
  ]);

  // Selected Day Details
  const selectedDayData = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarData.daysList.find((d) => d.dateStr === selectedDateStr) || null;
  }, [selectedDateStr, calendarData.daysList]);

  // Summary Metrics for the current month (100% Real)
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

    const netMonthChange = projectedEndBalance - startBalance;

    return {
      startBalance,
      projectedEndBalance,
      totalIncomeMonth,
      totalExpenseMonth,
      totalDuePayablesMonth,
      totalDueReceivablesMonth,
      netMonthChange,
      isDeficit: projectedEndBalance < 0 || netMonthChange < 0,
    };
  }, [calendarData.currentMonthDays, totalActualCashNow]);

  const weekDayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div id="cash-forecast-calendar-section" className="fintech-card rounded-3xl p-5 sm:p-6.5 transition-all space-y-6">
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Kalender Sisa Kas Riil
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Perhitungan Riil (Transaksi & Cicilan Aktual)
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
            Posisi Sisa Kas Harian Terjadwal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl mt-0.5">
            Dihitung murni dari saldo riil akun, mutasi transaksi aktual, serta jadwal jatuh tempo cicilan hutang dan piutang tanpa estimasi asumsi biaya hidup.
          </p>
        </div>

        {/* Month Navigator & Mode Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Month Controller */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              id="calendar-prev-month-btn"
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
              id="calendar-next-month-btn"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Today button */}
          <button
            id="calendar-today-btn"
            onClick={handleJumpToToday}
            className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-all cursor-pointer"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* 2. Key Month Financial Health Banner & Metrics (100% Real) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Sisa Kas Akhir Bulan */}
        <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sisa Kas Akhir Bulan
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

        {/* Metric 2: Total Inflow Kas Bulan Ini */}
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

        {/* Metric 3: Total Outflow & Tagihan */}
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Total Outflow & Cicilan
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatMoney(monthSummary.totalExpenseMonth + monthSummary.totalDuePayablesMonth)}
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
            const isPositiveEnd = day.endOfDayCashBalance >= 0;
            const isCriticalLow = day.endOfDayCashBalance < 500000;

            return (
              <div
                key={`cash-cell-${day.dateStr}-${cellIdx}`}
                id={`calendar-cell-${day.dateStr}`}
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

                {/* End-of-day Cash Balance (Pure Real) */}
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

      {/* 4. Legend & Action Footer */}
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
              id="calendar-add-tx-btn"
              onClick={() => onOpenNewTransaction(selectedDateStr || todayStr)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Catat di Tanggal Terpilih</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Interactive Day Detail Modal */}
      {detailModalOpen && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {selectedDayData.isPast ? 'Tanggal Lampau' : selectedDayData.isToday ? 'Hari Ini' : 'Terjadwal'}
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
                id="close-calendar-detail-modal-btn"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* End of Day Cash KPI (Pure Real Calculation) */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                  Saldo Sisa Kas Akhir Hari
                </span>
                <div className="text-2xl font-black font-mono tracking-tight mt-1 text-white tabular-nums">
                  {formatMoney(selectedDayData.endOfDayCashBalance)}
                </div>
                <span className="text-xs text-slate-300 mt-1 block">
                  {selectedDayData.isPast
                    ? 'Status: Posisi Riil Berdasarkan Mutasi Tercatat'
                    : 'Status: Posisi Riil Berdasarkan Saldo Akun & Jadwal Cicilan'}
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
