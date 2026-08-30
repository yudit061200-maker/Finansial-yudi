import React, { useState, useMemo } from 'react';
import { DebtRecord, Account, Transaction } from '../types/finance';
import { formatRupiah, formatRupiahShort, formatDateIndo, formatDateFull } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Filter,
  DollarSign,
  Wallet,
  Phone,
  Sparkles,
  List,
  Grid,
} from 'lucide-react';

export type CalendarFilterType = 'all' | 'installment' | 'payable' | 'receivable' | 'transaction';

export interface CalendarEventItem {
  id: string;
  type: 'installment' | 'payable' | 'receivable' | 'transaction';
  date: string; // YYYY-MM-DD
  title: string;
  subTitle?: string;
  amount: number;
  paidAmount?: number;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'today';
  debtRef?: DebtRecord;
  transactionRef?: Transaction;
  color: string;
  iconType: 'installment' | 'payable' | 'receivable' | 'transaction';
}

interface PaymentCalendarProps {
  debts: DebtRecord[];
  accounts: Account[];
  transactions: Transaction[];
  onOpenPaymentModal: (debt: DebtRecord, monthNum?: number) => void;
  onOpenAddDebt: () => void;
  onOpenAddTransaction: () => void;
}

export const PaymentCalendar: React.FC<PaymentCalendarProps> = ({
  debts,
  accounts,
  transactions,
  onOpenPaymentModal,
  onOpenAddDebt,
  onOpenAddTransaction,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().split('T')[0]
  );
  const [filterType, setFilterType] = useState<CalendarFilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Month navigation
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
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Generate All Calendar Events for this month and visible grid
  const calendarEvents = useMemo(() => {
    const events: CalendarEventItem[] = [];
    const nowStr = new Date().toISOString().split('T')[0];
    const targetMonthStr = (currentMonth + 1).toString().padStart(2, '0');
    const prefix = `${currentYear}-${targetMonthStr}`;
    const maxDaysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Helper to calculate exact date for a day number in a specific month
    const getDateForDay = (year: number, month: number, day: number) => {
      const maxDays = new Date(year, month + 1, 0).getDate();
      const validDay = Math.min(Math.max(1, day), maxDays);
      const mStr = (month + 1).toString().padStart(2, '0');
      const dStr = validDay.toString().padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    };

    // Calculate grid range dates (prev month trailing + current + next month leading)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const visibleDates = new Set<string>();
    // Previous month trailing days
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      visibleDates.add(getDateForDay(prevYear, prevMonth, d));
    }
    // Current month days
    for (let d = 1; d <= maxDaysInCurrentMonth; d++) {
      visibleDates.add(getDateForDay(currentYear, currentMonth, d));
    }
    // Next month leading days
    const remainingDays = 42 - visibleDates.size;
    for (let d = 1; d <= remainingDays; d++) {
      visibleDates.add(getDateForDay(nextYear, nextMonth, d));
    }

    // 1. Process Debts & Installments
    debts.forEach((debt) => {
      const isInst = debt.type === 'installment' || debt.isInstallment;
      const isPaid = debt.status === 'paid';

      // Determine nominal per payment
      let amountToPay = 0;
      if (isInst) {
        amountToPay =
          debt.monthlyInstallment && debt.monthlyInstallment > 0
            ? debt.monthlyInstallment
            : debt.totalAmount && debt.tenorMonths && debt.tenorMonths > 0
            ? Math.round(debt.totalAmount / debt.tenorMonths)
            : debt.remainingAmount > 0
            ? debt.remainingAmount
            : debt.totalAmount || debt.paidAmount || 0;
      } else {
        amountToPay =
          debt.remainingAmount > 0
            ? debt.remainingAmount
            : debt.totalAmount || debt.paidAmount || 0;
      }

      // Title & Subtitle fallback
      const title = isInst
        ? debt.itemName || debt.title || 'Cicilan Kredit'
        : debt.title || debt.personName || 'Tagihan Hutang/Piutang';
      const subTitle = isInst
        ? `${debt.providerName || debt.personName || 'Kredit'} • Bln ${(debt.paidMonths || 0) + 1}/${debt.tenorMonths || 12}`
        : debt.personName || debt.category || (debt.type === 'payable' ? 'Hutang' : 'Piutang');

      // Determine due day
      const dueDay =
        debt.dueDayOfMonth ||
        (debt.dueDate ? parseInt(debt.dueDate.split('-')[2], 10) : undefined) ||
        (debt.startDate ? parseInt(debt.startDate.split('-')[2], 10) : 5);

      const targetDatesForThisDebt = new Set<string>();

      if (isPaid) {
        // If paid, show on dueDate or when it was paid
        if (debt.dueDate) {
          targetDatesForThisDebt.add(debt.dueDate);
        }
        if (debt.payments && debt.payments.length > 0) {
          debt.payments.forEach((p) => {
            if (p.date) targetDatesForThisDebt.add(p.date);
          });
        }
      } else {
        // For active/unpaid installment or debt:
        // Always place on the due day of the currently viewed month
        const thisMonthDate = getDateForDay(currentYear, currentMonth, dueDay);
        targetDatesForThisDebt.add(thisMonthDate);

        // If dueDate is explicitly defined and within visible grid, also include it
        if (debt.dueDate && visibleDates.has(debt.dueDate)) {
          targetDatesForThisDebt.add(debt.dueDate);
        }

        // Also check if due day falls on visible trailing days in prev or next month
        const prevMonthDate = getDateForDay(prevYear, prevMonth, dueDay);
        if (visibleDates.has(prevMonthDate)) {
          targetDatesForThisDebt.add(prevMonthDate);
        }
        const nextMonthDate = getDateForDay(nextYear, nextMonth, dueDay);
        if (visibleDates.has(nextMonthDate)) {
          targetDatesForThisDebt.add(nextMonthDate);
        }
      }

      targetDatesForThisDebt.forEach((eventDate) => {
        if (!visibleDates.has(eventDate) && !eventDate.startsWith(prefix)) return;

        let status: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'today' = 'unpaid';
        if (isPaid) {
          status = 'paid';
        } else if (eventDate === nowStr) {
          status = 'today';
        } else if (eventDate < nowStr) {
          status = 'overdue';
        } else if (debt.status === 'partial') {
          status = 'partial';
        }

        events.push({
          id: `debt-event-${debt.id}-${eventDate}`,
          type: isInst ? 'installment' : debt.type,
          date: eventDate,
          title,
          subTitle,
          amount: amountToPay,
          paidAmount: debt.paidAmount,
          status,
          debtRef: debt,
          color: isInst ? '#6366F1' : debt.type === 'payable' ? '#EF4444' : '#10B981',
          iconType: isInst ? 'installment' : debt.type,
        });
      });
    });

    // 2. Process Transactions in visible range
    transactions.forEach((tx) => {
      if (visibleDates.has(tx.date)) {
        events.push({
          id: `tx-event-${tx.id}`,
          type: 'transaction',
          date: tx.date,
          title: tx.title || 'Transaksi',
          subTitle: tx.category || (tx.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'),
          amount: tx.amount,
          status: 'paid',
          transactionRef: tx,
          color: tx.type === 'expense' ? '#64748B' : '#10B981',
          iconType: 'transaction',
        });
      }
    });

    // Sort events so priority items (installments & debts) come first
    events.sort((a, b) => {
      const typeRank = (t: string) => (t === 'installment' ? 1 : t === 'payable' ? 2 : t === 'receivable' ? 3 : 4);
      const statusRank = (s: string) => (s === 'overdue' ? 1 : s === 'today' ? 2 : s === 'unpaid' ? 3 : s === 'partial' ? 4 : 5);
      return typeRank(a.type) - typeRank(b.type) || statusRank(a.status) - statusRank(b.status) || b.amount - a.amount;
    });

    return events;
  }, [debts, transactions, currentYear, currentMonth]);

  // Filtered events based on user filter chip
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return calendarEvents;
    return calendarEvents.filter((ev) => ev.type === filterType);
  }, [calendarEvents, filterType]);

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    filteredEvents.forEach((ev) => {
      const existing = map.get(ev.date) || [];
      existing.push(ev);
      map.set(ev.date, existing);
    });
    return map;
  }, [filteredEvents]);

  // Selected Date Events
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((ev) => ev.date === selectedDateStr);
  }, [filteredEvents, selectedDateStr]);

  // Monthly Quick Stats
  const monthStats = useMemo(() => {
    const targetMonthStr = (currentMonth + 1).toString().padStart(2, '0');
    const prefix = `${currentYear}-${targetMonthStr}`;
    const debtEvents = calendarEvents.filter((e) => e.type !== 'transaction' && e.date.startsWith(prefix));
    const totalObligations = debtEvents
      .filter((e) => e.type === 'installment' || e.type === 'payable')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPaid = debtEvents
      .filter((e) => (e.type === 'installment' || e.type === 'payable') && e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalUnpaid = totalObligations - totalPaid;

    const totalReceivables = debtEvents
      .filter((e) => e.type === 'receivable')
      .reduce((sum, e) => sum + e.amount, 0);

    const overdueCount = debtEvents.filter((e) => e.status === 'overdue').length;
    const todayCount = debtEvents.filter((e) => e.status === 'today').length;

    return {
      totalObligations,
      totalPaid,
      totalUnpaid,
      totalReceivables,
      overdueCount,
      todayCount,
    };
  }, [calendarEvents, currentYear, currentMonth]);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    // Adjust so Monday is 0
    const adjustedFirstDay = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Previous month trailing days
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 12 : currentMonth;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = (currentMonth + 1).toString().padStart(2, '0');
      const dayStr = i.toString().padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: true,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // 3. Next month trailing days to complete grid (42 days total)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate]);

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Kalender Pembayaran & Jatuh Tempo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pantau seluruh jadwal cicilan barang, tagihan hutang, dan piutang dalam satu kalender interaktif.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            onClick={onOpenAddDebt}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Tagihan / Kredit</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kewajiban Bulan Ini */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Tagihan Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalObligations)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Cicilan & hutang jatuh tempo di {monthNames[currentMonth]} {currentYear}
          </div>
        </div>

        {/* Card 2: Sisa Belum Dibayar */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Sisa Wajib Dibayar
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalUnpaid)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Sudah Lunas: {formatRupiah(monthStats.totalPaid)}</span>
            {monthStats.overdueCount > 0 && (
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {monthStats.overdueCount} Terlambat
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Piutang / Pemasukan Tagihan */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Ekspektasi Piutang Masuk
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Uang pinjaman yang jatuh tempo ditagih
          </div>
        </div>

        {/* Card 4: Jatuh Tempo Hari Ini / Urgent */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-md border border-indigo-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Status Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-white">
              {monthStats.todayCount > 0
                ? `${monthStats.todayCount} Tagihan Hari Ini`
                : monthStats.overdueCount > 0
                ? `${monthStats.overdueCount} Tagihan Lewat Tempo`
                : 'Semua Terkendali'}
            </div>
            <div className="text-[11px] text-indigo-200/80 mt-1">
              Tanggal terpilih: {formatDateIndo(selectedDateStr)}
            </div>
          </div>
          <button
            onClick={handleJumpToToday}
            className="text-[11px] font-bold text-indigo-300 hover:text-white underline text-left cursor-pointer"
          >
            Lompat ke Hari Ini →
          </button>
        </div>
      </div>

      {/* Calendar Controls & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm transition-colors space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-900 dark:text-white px-3 min-w-[140px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleJumpToToday}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
          </div>

          {/* Filter Chips & View Mode */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-x-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('installment')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterType === 'installment'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cicilan Kredit
              </button>
              <button
                onClick={() => setFilterType('payable')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterType === 'payable'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Hutang
              </button>
              <button
                onClick={() => setFilterType('receivable')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  filterType === 'receivable'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Piutang
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
                title="Tampilan Kalender Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
                title="Tampilan Daftar Agenda"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid View */}
        {viewMode === 'grid' ? (
          <div className="space-y-2">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={day}
                  className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl ${
                    idx >= 5
                      ? 'text-rose-500 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 42 Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === todayStr;
                const hasEvents = cell.events.length > 0;
                const hasOverdue = cell.events.some((e) => e.status === 'overdue');
                const hasInstallment = cell.events.some((e) => e.type === 'installment');
                const dayTotalAmount = cell.events.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[105px] sm:min-h-[125px] lg:min-h-[135px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/40 shadow-xs'
                        : isToday
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/30'
                        : cell.isCurrentMonth
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                        : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Top Day Number & Day Total Nominal */}
                    <div className="flex items-center justify-between w-full gap-1">
                      <span
                        className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isToday
                            ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300 dark:ring-amber-700'
                            : isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : cell.isCurrentMonth
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasEvents && (
                        <span className="text-[9px] sm:text-[10px] font-black text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-lg truncate shadow-2xs">
                          {formatRupiahShort(dayTotalAmount)}
                        </span>
                      )}
                    </div>

                    {/* Event Badges with Clear Monetary Numbers in Cell */}
                    <div className="mt-1 space-y-1 w-full">
                      {cell.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[9px] sm:text-[10px] p-1.5 rounded-xl flex flex-col gap-0.5 border leading-tight ${
                            ev.status === 'paid'
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                              : ev.status === 'overdue'
                              ? 'bg-rose-50/90 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 font-bold'
                              : ev.type === 'installment'
                              ? 'bg-indigo-50/90 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
                              : ev.type === 'payable'
                              ? 'bg-rose-50/90 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-bold text-[9px] sm:text-[10px]">{ev.title}</span>
                            {ev.debtRef?.tenorMonths ? (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-white/90 dark:bg-slate-900/90 font-black shrink-0 text-slate-700 dark:text-slate-300">
                                Bln {(ev.debtRef.paidMonths || 0) + 1}/{ev.debtRef.tenorMonths}
                              </span>
                            ) : null}
                          </div>
                          {/* Big Prominent Number for Installment Amount */}
                          <div className="font-black text-[10px] sm:text-[11px] tracking-tight text-slate-900 dark:text-white flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-slate-900 dark:text-white font-extrabold bg-white/60 dark:bg-slate-900/60 px-1 py-0.2 rounded">
                              {formatRupiahShort(ev.amount)}
                            </span>
                            <span className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded ${
                              ev.status === 'paid'
                                ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900'
                                : ev.status === 'overdue'
                                ? 'text-rose-700 bg-rose-100 dark:bg-rose-900'
                                : 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900'
                            }`}>
                              {ev.status === 'paid' ? 'Lunas' : ev.status === 'overdue' ? 'Lewat' : 'Tempo'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {cell.events.length > 2 && (
                        <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-0.5 flex items-center justify-between">
                          <span>+{cell.events.length - 2} lagi</span>
                          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                            {formatRupiahShort(dayTotalAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50 text-indigo-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tidak ada agenda tagihan atau pembayaran di bulan ini.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedDateStr(ev.date)}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    ev.date === selectedDateStr
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                    >
                      {ev.type === 'installment' ? (
                        <ShoppingBag className="w-5 h-5" />
                      ) : ev.type === 'payable' ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {ev.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ev.subTitle} • {formatDateIndo(ev.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {formatRupiah(ev.amount)}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        ev.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                          : ev.status === 'overdue'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-600'
                          : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                      }`}
                    >
                      {ev.status === 'paid' ? 'Lunas' : ev.status === 'overdue' ? 'Terlambat' : 'Belum Bayar'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Date Detail Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Pembayaran & Tagihan: {formatDateFull(selectedDateStr)}
              </h3>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Hari Ini
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {selectedDateEvents.length > 0
                ? `Terdapat ${selectedDateEvents.length} item pembayaran yang tercatat pada tanggal ini.`
                : 'Tidak ada jadwal tagihan atau cicilan pada tanggal ini.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddDebt}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tagihan</span>
            </button>
          </div>
        </div>

        {/* Selected Date Items List */}
        {selectedDateEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Bebas dari jadwal pembayaran pada tanggal ini.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Pilih tanggal lain di kalender yang memiliki indikator badge untuk melihat tagihannya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateEvents.map((item) => {
              const isPaid = item.status === 'paid';
              const isOverdue = item.status === 'overdue';

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    isPaid
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : isOverdue
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {item.type === 'installment' ? (
                            <ShoppingBag className="w-5 h-5" />
                          ) : item.type === 'payable' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : item.type === 'receivable' ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <Receipt className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.subTitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isPaid ? 'Lunas' : isOverdue ? 'Lewat Jatuh Tempo' : 'Wajib Bayar'}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="mt-4 p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {item.type === 'receivable' ? 'Nominal Piutang:' : 'Nominal Tagihan:'}
                        </span>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {formatRupiah(item.amount)}
                        </div>
                      </div>

                      {item.debtRef && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Sisa Total:
                          </span>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            {formatRupiah(item.debtRef.remainingAmount)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-end gap-2">
                    {item.debtRef && !isPaid && (
                      <button
                        onClick={() => onOpenPaymentModal(item.debtRef!)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>
                          {item.type === 'receivable'
                            ? 'Terima Pelunasan'
                            : item.type === 'installment'
                            ? 'Bayar Angsuran Ini'
                            : 'Bayar Hutang'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
