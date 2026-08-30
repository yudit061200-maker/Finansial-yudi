import React, { useState, useMemo } from 'react';
import { DebtRecord, Account, Transaction } from '../types/finance';
import {
  formatRupiah,
  formatRupiahShort,
  formatDateIndo,
  formatDateFull,
  calculateLateFeeAndOverdue,
  isDebtPaid,
} from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Receipt,
  Filter,
  Wallet,
  Sparkles,
  List,
  Grid,
  Search,
  Eye,
  CreditCard,
  Coins,
} from 'lucide-react';

export type CalendarFilterType =
  | 'all'
  | 'installment'
  | 'payable'
  | 'receivable'
  | 'transaction'
  | 'expense'
  | 'income'
  | 'transfer';
export type CalendarStatusFilter = 'all' | 'paid' | 'overdue' | 'upcoming';

export interface CalendarEventItem {
  id: string;
  type: 'installment' | 'payable' | 'receivable' | 'transaction';
  date: string; // YYYY-MM-DD
  title: string;
  subTitle?: string;
  amount: number;
  paidAmount?: number;
  status: 'paid' | 'overdue' | 'upcoming';
  isToday?: boolean;
  debtRef?: DebtRecord;
  transactionRef?: Transaction;
  color: string;
  iconType: 'installment' | 'payable' | 'receivable' | 'transaction';
  lateFeeAmount?: number;
  daysOverdue?: number;
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
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [amountDisplayMode, setAmountDisplayMode] = useState<'full' | 'short'>('full');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeTransactions, setIncludeTransactions] = useState<boolean>(true);

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

  // Helper function to format amount based on user preference
  const formatAmount = (val: number, forceFull = false) => {
    if (forceFull || amountDisplayMode === 'full') {
      return formatRupiah(val);
    }
    return formatRupiahShort(val);
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
      const isDebtFullyPaid = isDebtPaid(debt);

      // Determine nominal per payment
      const monthlyNominal =
        debt.monthlyInstallment && debt.monthlyInstallment > 0
          ? debt.monthlyInstallment
          : debt.totalAmount && debt.tenorMonths && debt.tenorMonths > 0
          ? Math.round(debt.totalAmount / debt.tenorMonths)
          : debt.remainingAmount > 0
          ? debt.remainingAmount
          : debt.totalAmount || debt.paidAmount || 0;

      // Title & Subtitle fallback
      const title = isInst
        ? debt.itemName || debt.title || 'Cicilan Kredit'
        : debt.title || debt.personName || 'Tagihan Hutang/Piutang';

      // Base due day
      const dueDay =
        debt.dueDayOfMonth ||
        (debt.dueDate ? parseInt(debt.dueDate.split('-')[2], 10) : undefined) ||
        (debt.startDate ? parseInt(debt.startDate.split('-')[2], 10) : 5);

      // Late fee penalty calculation (only for active unpaid debts)
      const lateFeeCalc = !isDebtFullyPaid ? calculateLateFeeAndOverdue(debt) : null;

      // ----------------------------------------------------
      // CASE 1: DEBT IS FULLY PAID (SUDAH LUNAS TOTAL)
      // ----------------------------------------------------
      if (isDebtFullyPaid) {
        let hasAddedPaidEvent = false;

        // Add from recorded payments if available
        if (debt.payments && debt.payments.length > 0) {
          debt.payments.forEach((p, pIdx) => {
            const pDate = p.date ? p.date.split('T')[0] : '';
            if (pDate && (visibleDates.has(pDate) || pDate.startsWith(prefix))) {
              hasAddedPaidEvent = true;
              events.push({
                id: `debt-paid-${debt.id}-${p.id || pIdx}-${pDate}`,
                type: isInst ? 'installment' : debt.type,
                date: pDate,
                title,
                subTitle: isInst
                  ? `${debt.providerName || debt.personName || 'Kredit'} • Lunas (Bln ${p.monthNumber || pIdx + 1})`
                  : `${debt.personName || debt.category || 'Lunas'} • Pelunasan`,
                amount: p.amount || monthlyNominal,
                paidAmount: debt.paidAmount,
                status: 'paid',
                isToday: pDate === nowStr,
                debtRef: debt,
                color: '#10B981',
                iconType: isInst ? 'installment' : debt.type,
              });
            }
          });
        }

        // If no payment logs were in the visible range or payments array was empty,
        // display a single paid badge on its exact original due date / start date (NOT repeating every month)
        if (!hasAddedPaidEvent) {
          const fallbackDate =
            (debt.dueDate ? debt.dueDate.split('T')[0] : null) ||
            (debt.startDate ? debt.startDate.split('T')[0] : null) ||
            (debt.createdAt ? debt.createdAt.split('T')[0] : null);
          if (fallbackDate && (visibleDates.has(fallbackDate) || fallbackDate.startsWith(prefix))) {
            events.push({
              id: `debt-paid-${debt.id}-fallback`,
              type: isInst ? 'installment' : debt.type,
              date: fallbackDate,
              title,
              subTitle: isInst
                ? `${debt.providerName || debt.personName || 'Kredit'} • Sudah Lunas`
                : `${debt.personName || debt.category || 'Lunas'} • Sudah Lunas`,
              amount: monthlyNominal,
              paidAmount: debt.paidAmount,
              status: 'paid',
              isToday: fallbackDate === nowStr,
              debtRef: debt,
              color: '#10B981',
              iconType: isInst ? 'installment' : debt.type,
            });
          }
        }
        return; // Done with fully paid debt
      }

      // ----------------------------------------------------
      // CASE 2: ACTIVE INSTALLMENT (CICILAN BERJALAN)
      // ----------------------------------------------------
      if (isInst) {
        const tenor = debt.tenorMonths || 12;
        const paidMonths = debt.paidMonths || 0;
        const recordedPaymentDates = new Set<string>();

        // 2a. Add recorded payments as 'paid'
        if (debt.payments && debt.payments.length > 0) {
          debt.payments.forEach((p, pIdx) => {
            const pDate = p.date ? p.date.split('T')[0] : '';
            if (pDate && (visibleDates.has(pDate) || pDate.startsWith(prefix))) {
              recordedPaymentDates.add(pDate);
              events.push({
                id: `debt-inst-paid-${debt.id}-${p.id || pIdx}-${pDate}`,
                type: 'installment',
                date: pDate,
                title,
                subTitle: `${debt.providerName || debt.personName || 'Kredit'} • Lunas (Bln ${p.monthNumber || pIdx + 1}/${tenor})`,
                amount: p.amount || monthlyNominal,
                paidAmount: debt.paidAmount,
                status: 'paid',
                isToday: pDate === nowStr,
                debtRef: debt,
                color: '#10B981',
                iconType: 'installment',
              });
            }
          });
        }

        // 2b. Map schedule for each month of the tenor based on FIXED anchor date
        const baseStartDateStr =
          debt.startDate ||
          (debt.createdAt ? debt.createdAt.split('T')[0] : null) ||
          (debt.dueDate ? debt.dueDate.split('T')[0] : null);
        let baseStartYear = currentYear;
        let baseStartMonth = currentMonth;

        if (baseStartDateStr) {
          const parsed = new Date(baseStartDateStr + 'T00:00:00');
          if (!isNaN(parsed.getTime())) {
            baseStartYear = parsed.getFullYear();
            baseStartMonth = parsed.getMonth();
          }
        }

        for (let m = 1; m <= tenor; m++) {
          const monthOffset = m - 1;
          const targetM = baseStartMonth + monthOffset;
          const targetYear = baseStartYear + Math.floor(targetM / 12);
          const normalizedMonth = ((targetM % 12) + 12) % 12;
          const maxDays = new Date(targetYear, normalizedMonth + 1, 0).getDate();
          const validDay = Math.min(dueDay, maxDays);
          const scheduleDateStr = `${targetYear}-${(normalizedMonth + 1).toString().padStart(2, '0')}-${validDay.toString().padStart(2, '0')}`;

          if (!visibleDates.has(scheduleDateStr) && !scheduleDateStr.startsWith(prefix)) {
            continue;
          }

          // If this month index was already paid
          if (m <= paidMonths) {
            if (!recordedPaymentDates.has(scheduleDateStr)) {
              events.push({
                id: `debt-inst-sched-paid-${debt.id}-m${m}`,
                type: 'installment',
                date: scheduleDateStr,
                title,
                subTitle: `${debt.providerName || debt.personName || 'Kredit'} • Lunas (Bln ${m}/${tenor})`,
                amount: monthlyNominal,
                paidAmount: debt.paidAmount,
                status: 'paid',
                isToday: scheduleDateStr === nowStr,
                debtRef: debt,
                color: '#10B981',
                iconType: 'installment',
              });
            }
          }
          // If this is the active due month (the next unpaid installment)
          else if (m === paidMonths + 1) {
            const isOverdue = scheduleDateStr < nowStr;
            const status: 'overdue' | 'upcoming' = isOverdue ? 'overdue' : 'upcoming';

            events.push({
              id: `debt-inst-active-${debt.id}-m${m}`,
              type: 'installment',
              date: scheduleDateStr,
              title,
              subTitle: `${debt.providerName || debt.personName || 'Kredit'} • Bln ${m}/${tenor}`,
              amount: monthlyNominal,
              paidAmount: debt.paidAmount,
              status,
              isToday: scheduleDateStr === nowStr,
              debtRef: debt,
              color: isOverdue ? '#EF4444' : '#6366F1',
              iconType: 'installment',
              lateFeeAmount:
                isOverdue && lateFeeCalc?.totalLateFeePayable && lateFeeCalc.totalLateFeePayable > 0
                  ? lateFeeCalc.totalLateFeePayable
                  : undefined,
              daysOverdue: isOverdue && lateFeeCalc?.isOverdue ? lateFeeCalc.daysOverdue : undefined,
            });
          }
          // Future unpaid months
          else {
            events.push({
              id: `debt-inst-future-${debt.id}-m${m}`,
              type: 'installment',
              date: scheduleDateStr,
              title,
              subTitle: `${debt.providerName || debt.personName || 'Kredit'} • Bln ${m}/${tenor}`,
              amount: monthlyNominal,
              paidAmount: debt.paidAmount,
              status: 'upcoming',
              isToday: scheduleDateStr === nowStr,
              debtRef: debt,
              color: '#6366F1',
              iconType: 'installment',
            });
          }
        }
        return;
      }

      // ----------------------------------------------------
      // CASE 3: ACTIVE NON-INSTALLMENT (HUTANG / PIUTANG TUNAI)
      // ----------------------------------------------------
      // 3a. Add partial payments as 'paid'
      if (debt.payments && debt.payments.length > 0) {
        debt.payments.forEach((p, pIdx) => {
          const pDate = p.date ? p.date.split('T')[0] : '';
          if (pDate && (visibleDates.has(pDate) || pDate.startsWith(prefix))) {
            events.push({
              id: `debt-cash-paid-${debt.id}-${p.id || pIdx}-${pDate}`,
              type: debt.type,
              date: pDate,
              title,
              subTitle: `${debt.personName || debt.category || 'Pembayaran'} • Terbayar Sebagian`,
              amount: p.amount,
              paidAmount: debt.paidAmount,
              status: 'paid',
              isToday: pDate === nowStr,
              debtRef: debt,
              color: '#10B981',
              iconType: debt.type,
            });
          }
        });
      }

      // 3b. Active remaining debt on its EXACT ONE single due date (DO NOT repeat on every month)
      const singleDueDate =
        (debt.dueDate ? debt.dueDate.split('T')[0] : null) ||
        (debt.startDate ? debt.startDate.split('T')[0] : null) ||
        (debt.createdAt ? debt.createdAt.split('T')[0] : null);
      if (singleDueDate && (visibleDates.has(singleDueDate) || singleDueDate.startsWith(prefix))) {
        const isOverdue = singleDueDate < nowStr;
        const status: 'overdue' | 'upcoming' = isOverdue ? 'overdue' : 'upcoming';

        events.push({
          id: `debt-cash-due-${debt.id}-${singleDueDate}`,
          type: debt.type,
          date: singleDueDate,
          title,
          subTitle: debt.personName || debt.category || (debt.type === 'payable' ? 'Hutang' : 'Piutang'),
          amount: debt.remainingAmount > 0 ? debt.remainingAmount : monthlyNominal,
          paidAmount: debt.paidAmount,
          status,
          isToday: singleDueDate === nowStr,
          debtRef: debt,
          color: isOverdue ? '#EF4444' : debt.type === 'payable' ? '#F97316' : '#10B981',
          iconType: debt.type,
          lateFeeAmount:
            isOverdue && lateFeeCalc?.totalLateFeePayable && lateFeeCalc.totalLateFeePayable > 0
              ? lateFeeCalc.totalLateFeePayable
              : undefined,
          daysOverdue: isOverdue && lateFeeCalc?.isOverdue ? lateFeeCalc.daysOverdue : undefined,
        });
      }
    });

    // 2. Process Transactions in visible range if enabled
    if (includeTransactions && transactions && transactions.length > 0) {
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      transactions.forEach((tx) => {
        if (!tx || !tx.date) return;
        const txDate = tx.date.split('T')[0]; // Safe YYYY-MM-DD
        if (visibleDates.has(txDate) || txDate.startsWith(prefix)) {
          const fromAcc = accountMap.get(tx.accountId)?.name || 'Akun';
          const toAcc = tx.destinationAccountId
            ? accountMap.get(tx.destinationAccountId)?.name || 'Akun Tujuan'
            : '';

          let subTitle = '';
          if (tx.type === 'transfer') {
            subTitle = tx.notes
              ? `Transfer: ${fromAcc} ➔ ${toAcc} • Note: ${tx.notes}`
              : `Transfer: ${fromAcc} ➔ ${toAcc}`;
          } else if (tx.type === 'expense') {
            subTitle = tx.notes
              ? `${fromAcc} • ${tx.category || 'Pengeluaran'} • Note: ${tx.notes}`
              : `${fromAcc} • ${tx.category || 'Pengeluaran'}`;
          } else {
            subTitle = tx.notes
              ? `${fromAcc} • ${tx.category || 'Pemasukan'} • Note: ${tx.notes}`
              : `${fromAcc} • ${tx.category || 'Pemasukan'}`;
          }

          events.push({
            id: `tx-event-${tx.id}`,
            type: 'transaction',
            date: txDate,
            title:
              tx.title ||
              (tx.type === 'expense'
                ? 'Pengeluaran'
                : tx.type === 'income'
                ? 'Pemasukan'
                : 'Transfer Saldo'),
            subTitle,
            amount: tx.amount,
            status: 'paid', // Cash transactions already executed / completed
            isToday: txDate === nowStr,
            transactionRef: tx,
            color:
              tx.type === 'expense' ? '#EF4444' : tx.type === 'income' ? '#10B981' : '#3B82F6',
            iconType: 'transaction',
          });
        }
      });
    }

    // Sort events so priority items (installments & debts) come first
    events.sort((a, b) => {
      const typeRank = (t: string) =>
        t === 'installment' ? 1 : t === 'payable' ? 2 : t === 'receivable' ? 3 : 4;
      const statusRank = (s: string) => (s === 'overdue' ? 1 : s === 'upcoming' ? 2 : 3);
      return (
        typeRank(a.type) - typeRank(b.type) ||
        statusRank(a.status) - statusRank(b.status) ||
        b.amount - a.amount
      );
    });

    return events;
  }, [debts, transactions, accounts, currentYear, currentMonth, includeTransactions]);

  // Total current liquid balance across all accounts
  const totalCurrentBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // Projected Cash Balance for every date in calendar view based on real liquid accounts
  const projectedBalanceByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        projectedBalance: number;
        dailyIncome: number;
        dailyExpense: number;
        netDaily: number;
        unpaidCount: number;
        paidCount: number;
        overdueCount: number;
      }
    >();

    const nowStr = new Date().toISOString().split('T')[0];

    // Collect all chronological dates in the month view & calendar grid
    const allDatesSet = new Set<string>();
    calendarEvents.forEach((e) => allDatesSet.add(e.date));

    // Days in current viewed month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = (currentMonth + 1).toString().padStart(2, '0');
      const dStr = d.toString().padStart(2, '0');
      allDatesSet.add(`${currentYear}-${mStr}-${dStr}`);
    }
    // Also ensure today is in the set
    allDatesSet.add(nowStr);

    // Sort all dates chronologically
    const sortedDates = Array.from(allDatesSet).sort();

    // Categorize daily movements for each date
    const dailyData: Record<
      string,
      {
        executedIncome: number;
        executedExpense: number;
        pendingIncome: number;
        pendingExpense: number;
        unpaidCount: number;
        paidCount: number;
        overdueCount: number;
      }
    > = {};

    sortedDates.forEach((dStr) => {
      dailyData[dStr] = {
        executedIncome: 0,
        executedExpense: 0,
        pendingIncome: 0,
        pendingExpense: 0,
        unpaidCount: 0,
        paidCount: 0,
        overdueCount: 0,
      };
    });

    calendarEvents.forEach((ev) => {
      if (!dailyData[ev.date]) {
        dailyData[ev.date] = {
          executedIncome: 0,
          executedExpense: 0,
          pendingIncome: 0,
          pendingExpense: 0,
          unpaidCount: 0,
          paidCount: 0,
          overdueCount: 0,
        };
      }

      if (ev.status === 'paid') {
        dailyData[ev.date].paidCount += 1;
        if (ev.type === 'transaction' && ev.transactionRef) {
          if (ev.transactionRef.type === 'income') {
            dailyData[ev.date].executedIncome += ev.amount;
          } else if (ev.transactionRef.type === 'expense') {
            dailyData[ev.date].executedExpense += ev.amount;
          }
          // Note: transfer between accounts does not alter total liquid cash balance
        } else if (ev.type === 'receivable') {
          dailyData[ev.date].executedIncome += ev.amount;
        } else {
          // installment / payable paid
          dailyData[ev.date].executedExpense += ev.amount;
        }
      } else if (ev.status === 'overdue') {
        dailyData[ev.date].overdueCount += 1;
        if (ev.type === 'receivable') {
          dailyData[ev.date].pendingIncome += ev.amount;
        } else {
          dailyData[ev.date].pendingExpense += ev.amount + (ev.lateFeeAmount || 0);
        }
      } else if (ev.status === 'upcoming') {
        dailyData[ev.date].unpaidCount += 1;
        if (ev.type === 'receivable') {
          dailyData[ev.date].pendingIncome += ev.amount;
        } else {
          dailyData[ev.date].pendingExpense += ev.amount;
        }
      }
    });

    // 1. Current real cash balance right now (as of today)
    const currentCash = totalCurrentBalance;

    // 2. Find today's index in sorted array
    let todayIdx = sortedDates.indexOf(nowStr);
    if (todayIdx === -1) {
      todayIdx = sortedDates.findIndex((d) => d >= nowStr);
      if (todayIdx === -1) todayIdx = sortedDates.length - 1;
    }

    // 3. Backward calculation for past dates (< today):
    // For past dates, the cash balance at end of date D was:
    // Balance(D) = currentCash - sum_{day t in (D..today]} (executedIncome(t) - executedExpense(t))
    let pastCash = currentCash;
    for (let i = todayIdx; i >= 0; i--) {
      const dStr = sortedDates[i];
      const d = dailyData[dStr];

      if (dStr === nowStr) {
        // Today
        const dailyIncome = d.executedIncome + d.pendingIncome;
        const dailyExpense = d.executedExpense + d.pendingExpense;
        const netDaily = dailyIncome - dailyExpense;
        const projectedEndToday = currentCash + d.pendingIncome - d.pendingExpense;

        map.set(dStr, {
          projectedBalance: projectedEndToday,
          dailyIncome,
          dailyExpense,
          netDaily,
          unpaidCount: d.unpaidCount,
          paidCount: d.paidCount,
          overdueCount: d.overdueCount,
        });

        // For past days, subtract today's executed net change
        pastCash -= (d.executedIncome - d.executedExpense);
      } else {
        // Historical date before today
        const dailyIncome = d.executedIncome;
        const dailyExpense = d.executedExpense;
        const netDaily = dailyIncome - dailyExpense;

        map.set(dStr, {
          projectedBalance: pastCash,
          dailyIncome,
          dailyExpense,
          netDaily,
          unpaidCount: d.unpaidCount,
          paidCount: d.paidCount,
          overdueCount: d.overdueCount,
        });

        // Step back one more day
        pastCash -= (d.executedIncome - d.executedExpense);
      }
    }

    // 4. Forward projection for future dates (> today):
    // Starting from today's projected end-of-day balance
    const todayData = dailyData[nowStr] || {
      executedIncome: 0,
      executedExpense: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      unpaidCount: 0,
      paidCount: 0,
      overdueCount: 0,
    };

    let futureRunning = currentCash + todayData.pendingIncome - todayData.pendingExpense;

    for (let i = todayIdx + 1; i < sortedDates.length; i++) {
      const dStr = sortedDates[i];
      const d = dailyData[dStr];

      const dailyIncome = d.pendingIncome + d.executedIncome;
      const dailyExpense = d.pendingExpense + d.executedExpense;
      const netDaily = dailyIncome - dailyExpense;

      futureRunning += (d.pendingIncome - d.pendingExpense);

      map.set(dStr, {
        projectedBalance: futureRunning,
        dailyIncome,
        dailyExpense,
        netDaily,
        unpaidCount: d.unpaidCount,
        paidCount: d.paidCount,
        overdueCount: d.overdueCount,
      });
    }

    return map;
  }, [calendarEvents, totalCurrentBalance, currentYear, currentMonth]);

  // Filtered events based on user filter chip and search query
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      // Type filter
      if (filterType !== 'all') {
        if (filterType === 'expense') {
          if (ev.type !== 'transaction' || ev.transactionRef?.type !== 'expense') return false;
        } else if (filterType === 'income') {
          if (ev.type !== 'transaction' || ev.transactionRef?.type !== 'income') return false;
        } else if (filterType === 'transfer') {
          if (ev.type !== 'transaction' || ev.transactionRef?.type !== 'transfer') return false;
        } else if (filterType === 'transaction') {
          if (ev.type !== 'transaction') return false;
        } else if (ev.type !== filterType) {
          return false;
        }
      }

      // Status filter: 'all' | 'paid' | 'overdue' | 'upcoming'
      if (statusFilter === 'paid' && ev.status !== 'paid') return false;
      if (statusFilter === 'overdue') {
        if (ev.type === 'transaction') return false; // Transactions are never overdue
        if (ev.status !== 'overdue') return false;
      }
      if (statusFilter === 'upcoming') {
        if (ev.type === 'transaction') return false; // Completed transactions are never upcoming
        if (ev.status !== 'upcoming') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchSubtitle = (ev.subTitle || '').toLowerCase().includes(q);
        const matchPerson = (ev.debtRef?.personName || '').toLowerCase().includes(q);
        const matchItem = (ev.debtRef?.itemName || '').toLowerCase().includes(q);
        const matchNotes = (ev.transactionRef?.notes || '').toLowerCase().includes(q);
        const matchCategory = (ev.transactionRef?.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubtitle && !matchPerson && !matchItem && !matchNotes && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [calendarEvents, filterType, statusFilter, searchQuery]);

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

  // Selected Date Cash Flow Projection
  const selectedDateProjection = useMemo(() => {
    return projectedBalanceByDate.get(selectedDateStr) || {
      projectedBalance: totalCurrentBalance,
      dailyIncome: 0,
      dailyExpense: 0,
      netDaily: 0,
      unpaidCount: 0,
      paidCount: 0,
      overdueCount: 0,
    };
  }, [projectedBalanceByDate, selectedDateStr, totalCurrentBalance]);

  // Monthly Quick Stats organized strictly into Lunas, Telat, Akan Datang, and Cash Projection
  const monthStats = useMemo(() => {
    const targetMonthStr = (currentMonth + 1).toString().padStart(2, '0');
    const prefix = `${currentYear}-${targetMonthStr}`;
    const debtEvents = calendarEvents.filter((e) => e.type !== 'transaction' && e.date.startsWith(prefix));

    // LUNAS (Paid)
    const paidEvents = debtEvents.filter((e) => e.status === 'paid');
    const totalPaidAmount = paidEvents.reduce((sum, e) => sum + e.amount, 0);
    const paidCount = paidEvents.length;

    // TELAT (Overdue)
    const overdueEvents = debtEvents.filter((e) => e.status === 'overdue');
    const totalOverdueAmount = overdueEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalLateFees = overdueEvents.reduce((sum, e) => sum + (e.lateFeeAmount || 0), 0);
    const overdueCount = overdueEvents.length;

    // AKAN DATANG (Upcoming)
    const upcomingEvents = debtEvents.filter((e) => e.status === 'upcoming');
    const totalUpcomingAmount = upcomingEvents.reduce((sum, e) => sum + e.amount, 0);
    const upcomingCount = upcomingEvents.length;

    // Total Semua Kewajiban
    const totalObligations = totalPaidAmount + totalOverdueAmount + totalUpcomingAmount;

    // Total Piutang Masuk Mendatang
    const totalReceivables = debtEvents
      .filter((e) => e.type === 'receivable' && e.status !== 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    // End-of-Month Estimated Remaining Balance
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const endOfMonthDateStr = `${currentYear}-${targetMonthStr}-${lastDayOfMonth.toString().padStart(2, '0')}`;
    const endOfMonthProjection = projectedBalanceByDate.get(endOfMonthDateStr)?.projectedBalance ?? totalCurrentBalance;

    return {
      totalObligations,
      totalPaidAmount,
      paidCount,
      totalOverdueAmount,
      totalLateFees,
      overdueCount,
      totalUpcomingAmount,
      upcomingCount,
      totalReceivables,
      totalCurrentBalance,
      endOfMonthProjection,
    };
  }, [calendarEvents, currentYear, currentMonth, projectedBalanceByDate, totalCurrentBalance]);

  // Calendar Grid Calculation (42 Cells)
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
        projection: projectedBalanceByDate.get(dateStr) || {
          projectedBalance: totalCurrentBalance,
          dailyIncome: 0,
          dailyExpense: 0,
          netDaily: 0,
          unpaidCount: 0,
          paidCount: 0,
          overdueCount: 0,
        },
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
        projection: projectedBalanceByDate.get(dateStr) || {
          projectedBalance: totalCurrentBalance,
          dailyIncome: 0,
          dailyExpense: 0,
          netDaily: 0,
          unpaidCount: 0,
          paidCount: 0,
          overdueCount: 0,
        },
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
        projection: projectedBalanceByDate.get(dateStr) || {
          projectedBalance: totalCurrentBalance,
          dailyIncome: 0,
          dailyExpense: 0,
          netDaily: 0,
          unpaidCount: 0,
          paidCount: 0,
          overdueCount: 0,
        },
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate, projectedBalanceByDate, totalCurrentBalance]);

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
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Kalender Pembayaran & Estimasi Kas Harian
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pantau status tagihan (Lunas, Telat, Akan Datang) serta perkiraan sisa uang disetiap tanggal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Format Nominal Toggle */}
          <button
            onClick={() => setAmountDisplayMode((prev) => (prev === 'full' ? 'short' : 'full'))}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-slate-700"
            title="Klik untuk ubah tampilan nominal uang di kalender"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Nominal: {amountDisplayMode === 'full' ? 'Lengkap (Rp 1.500.000)' : 'Singkat (Rp 1,5 Jt)'}
            </span>
          </button>

          <button
            onClick={onOpenAddDebt}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Tagihan / Kredit</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards - Structured by Lunas, Telat, Akan Datang, & Perkiraan Sisa Uang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: LUNAS */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/50 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sudah Lunas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs">
              {monthStats.paidCount}
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalPaidAmount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {monthStats.paidCount} pembayaran berhasil dilunasi
          </div>
        </div>

        {/* Card 2: TELAT */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Telat / Lewat Tempo
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 font-black text-xs">
              {monthStats.overdueCount}
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalOverdueAmount)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2 flex items-center justify-between">
            <span>{monthStats.overdueCount} tagihan terlambat</span>
            {monthStats.totalLateFees > 0 && (
              <span className="font-extrabold">+Denda {formatRupiahShort(monthStats.totalLateFees)}</span>
            )}
          </div>
        </div>

        {/* Card 3: AKAN DATANG */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/50 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Akan Datang
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
              {monthStats.upcomingCount}
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-2.5">
            {formatRupiah(monthStats.totalUpcomingAmount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Jadwal jatuh tempo mendatang di {monthNames[currentMonth]}
          </div>
        </div>

        {/* Card 4: PERKIRAAN SISA UANG */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-md border border-indigo-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              Perkiraan Sisa Uang
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className={`text-2xl font-black ${monthStats.endOfMonthProjection < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
              {formatRupiah(monthStats.endOfMonthProjection)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>Kas Riil Saat Ini:</span>
              <span className="font-bold text-white">{formatRupiahShort(monthStats.totalCurrentBalance)}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10 flex items-center justify-between">
            <span className="truncate">
              {monthStats.totalUpcomingAmount > 0 || monthStats.totalOverdueAmount > 0
                ? `Kewajiban: -${formatRupiahShort(monthStats.totalUpcomingAmount + monthStats.totalOverdueAmount)}`
                : 'Semua tagihan lunas'}
            </span>
            <button
              onClick={handleJumpToToday}
              className="text-indigo-300 hover:text-white font-bold underline cursor-pointer shrink-0 ml-1"
            >
              Hari Ini →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Controls & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm transition-colors space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Month Navigator */}
          <div className="flex items-center gap-3 flex-wrap">
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

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama cicilan / hutang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 md:w-56 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Core Status Filters: LUNAS, TELAT, AKAN DATANG, SEMUA */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lunas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${statusFilter === 'paid' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}`}>
                  {monthStats.paidCount}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Telat</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${statusFilter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}`}>
                  {monthStats.overdueCount}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'upcoming'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Akan Datang</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${statusFilter === 'upcoming' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'}`}>
                  {monthStats.upcomingCount}
                </span>
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="installment">Cicilan Kredit Saja</option>
              <option value="payable">Hutang Saja</option>
              <option value="receivable">Piutang Saja</option>
              <option value="transaction">Semua Transaksi Kas</option>
              <option value="expense">Uang Keluar Saja</option>
              <option value="income">Uang Masuk Saja</option>
              <option value="transfer">Transfer Antar Rekening</option>
            </select>

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
          <div className="space-y-2 overflow-x-auto">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 text-center min-w-[750px]">
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
            <div className="grid grid-cols-7 gap-1.5 min-w-[750px]">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === todayStr;
                const hasEvents = cell.events.length > 0;
                const hasOverdue = cell.events.some((e) => e.status === 'overdue');
                const hasUpcoming = cell.events.some((e) => e.status === 'upcoming');
                const dayTotalAmount = cell.events.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[130px] sm:min-h-[145px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/80 ring-2 ring-indigo-500/50 shadow-md'
                        : isToday
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                        : cell.isCurrentMonth
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                        : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Top Day Number & Day Total Tagihan Badge */}
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

                      {/* DAILY TOTAL NOMINAL BADGE */}
                      {hasEvents && (
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-lg truncate shadow-2xs ${
                            hasOverdue
                              ? 'text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/90 border border-rose-300 dark:border-rose-800'
                              : hasUpcoming
                              ? 'text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-900/90 border border-indigo-200 dark:border-indigo-800'
                              : 'text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/90 border border-emerald-200 dark:border-emerald-800'
                          }`}
                          title={`Total nominal tagihan tanggal ini: ${formatRupiah(dayTotalAmount)}`}
                        >
                          {formatAmount(dayTotalAmount)}
                        </span>
                      )}
                    </div>

                    {/* Event Badges with Clear LUNAS, TELAT, AKAN DATANG or TRANSAKSI tags */}
                    <div className="mt-1 space-y-1 w-full flex-1">
                      {cell.events.slice(0, 2).map((ev) => {
                        const isTx = ev.type === 'transaction';
                        const txType = ev.transactionRef?.type;

                        return (
                          <div
                            key={ev.id}
                            className={`text-[10px] p-1.5 rounded-xl flex flex-col gap-0.5 border leading-tight ${
                              isTx
                                ? txType === 'expense'
                                  ? 'bg-rose-50/80 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 border-rose-200 dark:border-rose-900/50'
                                  : txType === 'income'
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-900/50'
                                  : 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 border-blue-200 dark:border-blue-900/50'
                                : ev.status === 'paid'
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800'
                                : ev.status === 'overdue'
                                ? 'bg-rose-50/90 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 border-rose-300 dark:border-rose-800 font-bold'
                                : 'bg-indigo-50/90 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-bold text-[10px] text-slate-900 dark:text-white flex items-center gap-1">
                                {isTx ? (
                                  txType === 'expense' ? (
                                    <ArrowUpRight className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                  ) : txType === 'income' ? (
                                    <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <ArrowLeftRight className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                  )
                                ) : null}
                                <span className="truncate">{ev.title}</span>
                              </span>
                              {ev.debtRef?.tenorMonths ? (
                                <span
                                  className={`text-[8px] px-1 py-0.2 rounded font-black shrink-0 ${
                                    ev.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                                      : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {ev.status === 'paid'
                                    ? 'Lunas ✓'
                                    : `Bln ${(ev.debtRef.paidMonths || 0) + 1}/${ev.debtRef.tenorMonths}`}
                                </span>
                              ) : null}
                            </div>

                            {/* Nominal & Status Pill (Lunas, Telat, Akan Datang / Keluar, Masuk, Transfer) */}
                            <div className="font-black text-[10.5px] tracking-tight text-slate-900 dark:text-white flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-slate-900 dark:text-white font-extrabold bg-white/80 dark:bg-slate-900/80 px-1 py-0.5 rounded shadow-2xs">
                                {formatAmount(ev.amount)}
                              </span>
                              <span
                                className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                  isTx
                                    ? txType === 'expense'
                                      ? 'text-rose-700 bg-rose-100 dark:bg-rose-900/90'
                                      : txType === 'income'
                                      ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/90'
                                      : 'text-blue-700 bg-blue-100 dark:bg-blue-900/90'
                                    : ev.status === 'paid'
                                    ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/90'
                                    : ev.status === 'overdue'
                                    ? 'text-rose-700 bg-rose-100 dark:bg-rose-900/90 font-black'
                                    : 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/90'
                                }`}
                              >
                                {isTx ? (
                                  txType === 'expense' ? (
                                    <span>Keluar</span>
                                  ) : txType === 'income' ? (
                                    <span>Masuk</span>
                                  ) : (
                                    <span>Transfer</span>
                                  )
                                ) : ev.status === 'paid' ? (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5 inline" />
                                    <span>Lunas</span>
                                  </>
                                ) : ev.status === 'overdue' ? (
                                  <>
                                    <AlertTriangle className="w-2.5 h-2.5 inline" />
                                    <span>Telat</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-2.5 h-2.5 inline" />
                                    <span>Akan Datang</span>
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Late Fee indicator if overdue */}
                            {ev.lateFeeAmount && ev.lateFeeAmount > 0 && (
                              <div className="text-[8px] text-rose-700 dark:text-rose-300 font-extrabold flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>+Denda {formatRupiahShort(ev.lateFeeAmount)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {cell.events.length > 2 && (
                        <div className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400 pl-0.5 flex items-center justify-between">
                          <span>+{cell.events.length - 2} lagi</span>
                          <span className="text-[9.5px] font-black text-indigo-600 dark:text-indigo-400">
                            {formatAmount(dayTotalAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PERKIRAAN SISA UANG / SALDO KAS PADA TANGGAL INI */}
                    <div
                      className={`mt-1.5 pt-1 border-t text-[9px] font-black flex items-center justify-between gap-1 transition-colors ${
                        cell.projection.projectedBalance < 0
                          ? 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/80 px-1.5 py-0.5 rounded-lg'
                          : cell.projection.projectedBalance < 500000
                          ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-lg'
                          : 'text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-lg'
                      }`}
                      title={`Perkiraan sisa saldo kas pada ${cell.dateStr}: ${formatRupiah(cell.projection.projectedBalance)}`}
                    >
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        <Coins className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Sisa Kas:
                      </span>
                      <span className={`truncate font-black ${cell.projection.projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {formatAmount(cell.projection.projectedBalance)}
                      </span>
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
                  Tidak ada agenda tagihan atau pembayaran yang cocok dengan filter di bulan ini.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const isTx = ev.type === 'transaction';
                const txType = ev.transactionRef?.type;

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedDateStr(ev.date)}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      ev.date === selectedDateStr
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                      >
                        {ev.type === 'installment' ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : ev.type === 'payable' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : ev.type === 'receivable' ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : txType === 'expense' ? (
                          <ArrowUpRight className="w-5 h-5 text-rose-500" />
                        ) : txType === 'income' ? (
                          <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                        ) : txType === 'transfer' ? (
                          <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Receipt className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {ev.title}
                          </h4>
                          {isTx && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                txType === 'expense'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : txType === 'income'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {txType === 'expense'
                                ? 'Uang Keluar'
                                : txType === 'income'
                                ? 'Uang Masuk'
                                : 'Transfer Saldo'}
                            </span>
                          )}
                          {ev.debtRef?.tenorMonths && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                ev.status === 'paid'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {ev.status === 'paid'
                                ? 'Lunas'
                                : `Bln ${(ev.debtRef.paidMonths || 0) + 1} dari ${ev.debtRef.tenorMonths}`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {ev.subTitle} • {formatDateFull(ev.date)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {formatRupiah(ev.amount)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {ev.lateFeeAmount && ev.lateFeeAmount > 0 && (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                            +Denda {formatRupiah(ev.lateFeeAmount)}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            isTx
                              ? txType === 'expense'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : txType === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : ev.status === 'paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : ev.status === 'overdue'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {isTx ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                {txType === 'expense'
                                  ? 'Keluar'
                                  : txType === 'income'
                                  ? 'Masuk'
                                  : 'Transfer'}
                              </span>
                            </>
                          ) : ev.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Lunas</span>
                            </>
                          ) : ev.status === 'overdue' ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Telat ({ev.daysOverdue || 0} hari)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Akan Datang</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Date Detail Panel with Cash Flow & Item Inspector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rincian Tanggal: {formatDateFull(selectedDateStr)}
              </h3>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300">
                  Hari Ini
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Lihat perkiraan sisa uang dan daftar tagihan (Lunas, Telat, Akan Datang) pada tanggal ini.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddDebt}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tagihan</span>
            </button>
          </div>
        </div>

        {/* PROMINENT PERKIRAAN SISA UANG PADA TANGGAL TERPILIH */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pemasukan / Piutang Masuk:
            </span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4" />
              <span>+{formatRupiah(selectedDateProjection.dailyIncome)}</span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pengeluaran / Tagihan Keluar:
            </span>
            <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>-{formatRupiah(selectedDateProjection.dailyExpense)}</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${
            selectedDateProjection.projectedBalance < 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Perkiraan Sisa Uang:</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                selectedDateProjection.projectedBalance < 0
                  ? 'bg-rose-200 text-rose-800'
                  : 'bg-emerald-200 text-emerald-800'
              }`}>
                {selectedDateProjection.projectedBalance < 0 ? 'Defisit' : 'Surplus'}
              </span>
            </span>
            <div className={`text-lg font-black mt-1 ${
              selectedDateProjection.projectedBalance < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
            }`}>
              {formatRupiah(selectedDateProjection.projectedBalance)}
            </div>
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
              Pilih tanggal lain di kalender yang memiliki indikator nominal badge untuk melihat rinciannya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedDateEvents.map((item) => {
              const isPaid = item.status === 'paid';
              const isOverdue = item.status === 'overdue';
              const isTx = item.type === 'transaction';
              const txType = item.transactionRef?.type;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all shadow-xs ${
                    isTx
                      ? txType === 'expense'
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : txType === 'income'
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                      : isPaid
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
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {item.type === 'installment' ? (
                            <ShoppingBag className="w-5 h-5" />
                          ) : item.type === 'payable' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : item.type === 'receivable' ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : txType === 'expense' ? (
                            <ArrowUpRight className="w-5 h-5 text-rose-500" />
                          ) : txType === 'income' ? (
                            <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                          ) : txType === 'transfer' ? (
                            <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Receipt className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            {isTx && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  txType === 'expense'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : txType === 'income'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {txType === 'expense'
                                  ? 'Uang Keluar'
                                  : txType === 'income'
                                  ? 'Uang Masuk'
                                  : 'Transfer Saldo'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.subTitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isTx
                            ? txType === 'expense'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : txType === 'income'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : isPaid
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isTx ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {txType === 'expense'
                                ? 'Keluar'
                                : txType === 'income'
                                ? 'Masuk'
                                : 'Transfer'}
                            </span>
                          </>
                        ) : isPaid ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Lunas</span>
                          </>
                        ) : isOverdue ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Telat</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Akan Datang</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Detailed Amount Card */}
                    <div className="mt-4 p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isTx
                              ? txType === 'expense'
                                ? 'Nominal Pengeluaran:'
                                : txType === 'income'
                                ? 'Nominal Pemasukan:'
                                : 'Nominal Transfer:'
                              : item.type === 'receivable'
                              ? 'Nominal Piutang:'
                              : 'Nominal Angsuran Pokok:'}
                          </span>
                          <div
                            className={`text-xl font-black mt-0.5 ${
                              isTx
                                ? txType === 'expense'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : txType === 'income'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {isTx && (txType === 'expense' ? '-' : txType === 'income' ? '+' : '')}
                            {formatRupiah(item.amount)}
                          </div>
                        </div>

                        {item.debtRef && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Sisa Pokok Total:
                            </span>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                              {formatRupiah(item.debtRef.remainingAmount)}
                            </div>
                          </div>
                        )}

                        {isTx && item.transactionRef?.notes && (
                          <div className="text-right max-w-[200px]">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Catatan:
                            </span>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate" title={item.transactionRef.notes}>
                              {item.transactionRef.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Late fee calculation breakdown */}
                      {item.lateFeeAmount && item.lateFeeAmount > 0 && (
                        <div className="pt-2 border-t border-rose-100 dark:border-rose-900/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Denda Terlambat ({item.daysOverdue || 0} hari):</span>
                          </div>
                          <span className="font-extrabold text-rose-600 dark:text-rose-400">
                            +{formatRupiah(item.lateFeeAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-end gap-2">
                    {item.debtRef && !isPaid && (
                      <button
                        onClick={() => onOpenPaymentModal(item.debtRef!)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
