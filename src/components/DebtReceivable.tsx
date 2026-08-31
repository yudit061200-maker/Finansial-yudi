import React, { useState, useMemo, useEffect } from 'react';
import {
  DebtRecord,
  DebtType,
  DebtStatus,
  DebtPayment,
  DebtNote,
  Account,
  Transaction,
} from '../types/finance';
import {
  formatRupiah,
  formatRupiahShort,
  formatDateIndo,
  formatDateFull,
  calculateNearestDueDate,
  getNearestDueInfo,
  calculateLateFeeAndOverdue,
  LATE_FEE_PRESETS,
  LateFeeCalculationResult,
  isDebtPaid,
} from '../utils/formatters';
import { getCashSummary } from '../utils/cashflow';
import { MonthlyCreditCalculator } from './MonthlyCreditCalculator';
import { PaymentCalendar } from './PaymentCalendar';
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit2,
  History,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Check,
  Phone,
  HelpCircle,
  Calculator,
  ShoppingBag,
  PackageCheck,
  TrendingDown,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  CalendarDays,
  ListFilter,
  AlertTriangle,
  Timer,
  Percent,
  Coins,
  ShieldAlert,
  NotebookPen,
  StickyNote,
  Copy,
  FileText,
  MessageSquare,
} from 'lucide-react';

interface DebtReceivableProps {
  debts: DebtRecord[];
  accounts: Account[];
  transactions?: Transaction[];
  initialView?: 'list' | 'calendar' | 'monthly_calculator';
  onSaveDebt: (debt: DebtRecord) => Promise<void>;
  onDeleteDebt: (debtId: string) => Promise<void>;
  onAddTransaction?: (tx: Omit<Transaction, 'id'>) => Promise<void>;
}

export const DebtReceivable: React.FC<DebtReceivableProps> = ({
  debts,
  accounts,
  transactions = [],
  initialView = 'list',
  onSaveDebt,
  onDeleteDebt,
  onAddTransaction,
}) => {
  const [mainView, setMainView] = useState<'list' | 'calendar' | 'monthly_calculator'>(initialView);
  const [activeTab, setActiveTab] = useState<'all' | 'installment' | 'payable' | 'receivable' | 'overdue'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'createdAt' | 'lateDays'>('dueDate');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<DebtType | undefined>(undefined);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Notes Modal State (Fitur Catatan Hutang & Piutang)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeNotesDebt, setActiveNotesDebt] = useState<DebtRecord | null>(null);

  // Running Balance / Sisa Kas Calculation (Awalnya 0, menyesuaikan seluruh transaksi & cicilan)
  const cashSummary = useMemo(() => {
    return getCashSummary(transactions, 0);
  }, [transactions]);

  // Payment/Installment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentDebt, setActivePaymentDebt] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState<string>(accounts[0]?.id || '');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [syncWithTransaction, setSyncWithTransaction] = useState<boolean>(true);
  const [payingMonthNumber, setPayingMonthNumber] = useState<number | undefined>(undefined);

  // Late Fee Payment Specific States
  const [includeLateFee, setIncludeLateFee] = useState<boolean>(true);
  const [customLateFee, setCustomLateFee] = useState<number>(0);
  const [waiveLateFee, setWaiveLateFee] = useState<boolean>(false);

  // Expanded Payment History Accordions
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  // Sync activeNotesDebt if debts update
  useEffect(() => {
    if (activeNotesDebt) {
      const fresh = debts.find((d) => d.id === activeNotesDebt.id);
      if (fresh) {
        setActiveNotesDebt(fresh);
      }
    }
  }, [debts]);

  // Handlers for adding/deleting Debt Notes
  const handleSaveNote = async (debtId: string, noteData: Omit<DebtNote, 'id' | 'createdAt'>) => {
    const targetDebt = debts.find((d) => d.id === debtId) || activeNotesDebt;
    if (!targetDebt) return;

    const newNote: DebtNote = {
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...noteData,
    };

    const updatedNotes = [newNote, ...(targetDebt.debtNotes || [])];
    const updatedDebt: DebtRecord = {
      ...targetDebt,
      debtNotes: updatedNotes,
    };

    await onSaveDebt(updatedDebt);
    setActiveNotesDebt(updatedDebt);
  };

  const handleDeleteNote = async (debtId: string, noteId: string) => {
    const targetDebt = debts.find((d) => d.id === debtId) || activeNotesDebt;
    if (!targetDebt) return;

    const updatedNotes = (targetDebt.debtNotes || []).filter((n) => n.id !== noteId);
    const updatedDebt: DebtRecord = {
      ...targetDebt,
      debtNotes: updatedNotes,
    };

    await onSaveDebt(updatedDebt);
    setActiveNotesDebt(updatedDebt);
  };

  const handleOpenNotesModal = (debt: DebtRecord) => {
    setActiveNotesDebt(debt);
    setIsNotesModalOpen(true);
  };

  // Summary Calculations with Overdue Tracking
  const summary = useMemo(() => {
    const installments = debts.filter((d) => d.type === 'installment' || d.isInstallment);
    const totalInstallmentRemaining = installments
      .filter((d) => !isDebtPaid(d))
      .reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalInstallmentPaid = installments.reduce((sum, d) => sum + d.paidAmount, 0);

    const totalPayable = debts
      .filter((d) => d.type === 'payable' && !isDebtPaid(d))
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalReceivable = debts
      .filter((d) => d.type === 'receivable' && !isDebtPaid(d))
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalPaidPayable = debts
      .filter((d) => d.type === 'payable')
      .reduce((sum, d) => sum + d.paidAmount, 0);

    const totalPaidReceivable = debts
      .filter((d) => d.type === 'receivable')
      .reduce((sum, d) => sum + d.paidAmount, 0);

    // Total Semua Kewajiban (Hutang Tunai + Kredit Barang)
    const totalAllLiabilities = totalPayable + totalInstallmentRemaining;

    // Overdue Calculations
    const overdueDebts = debts.filter((d) => {
      if (isDebtPaid(d)) return false;
      const late = calculateLateFeeAndOverdue(d);
      return late.isOverdue;
    });

    const totalEstimatedLateFee = overdueDebts.reduce((sum, d) => {
      const late = calculateLateFeeAndOverdue(d);
      return sum + late.totalLateFeePayable;
    }, 0);

    // Overdue or upcoming within 7 days based on nearest due date
    const urgentCount = debts.filter((d) => {
      if (isDebtPaid(d)) return false;
      const dueInfo = getNearestDueInfo(d.dueDayOfMonth, d.dueDate, d.status, d);
      if (!dueInfo.dueDateStr) return false;
      return dueInfo.daysRemaining <= 7;
    }).length;

    return {
      totalInstallmentRemaining,
      totalInstallmentPaid,
      totalPayable,
      totalReceivable,
      totalAllLiabilities,
      netBalance: totalReceivable - totalAllLiabilities,
      totalPaidPayable,
      totalPaidReceivable,
      urgentCount,
      activeInstallmentCount: installments.filter((d) => !isDebtPaid(d)).length,
      overdueCount: overdueDebts.length,
      totalEstimatedLateFee,
    };
  }, [debts]);

  // Filtered & Sorted Debts
  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => {
        const isPaid = isDebtPaid(d);
        const late = calculateLateFeeAndOverdue(d);

        if (activeTab === 'installment') {
          if (d.type !== 'installment' && !d.isInstallment) return false;
        } else if (activeTab === 'payable') {
          if (d.type !== 'payable') return false;
        } else if (activeTab === 'receivable') {
          if (d.type !== 'receivable') return false;
        } else if (activeTab === 'overdue') {
          if (isPaid || !late.isOverdue) return false;
        }

        if (statusFilter === 'overdue') {
          if (isPaid || !late.isOverdue) return false;
        } else if (statusFilter === 'paid') {
          if (!isPaid) return false;
        } else if (statusFilter === 'partial') {
          if (isPaid || d.paidAmount === 0) return false;
        } else if (statusFilter === 'unpaid') {
          if (isPaid || d.paidAmount > 0) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchPerson = d.personName.toLowerCase().includes(q);
          const matchTitle = d.title.toLowerCase().includes(q);
          const matchItem = d.itemName?.toLowerCase().includes(q) || false;
          const matchProvider = d.providerName?.toLowerCase().includes(q) || false;
          const matchCategory = d.category?.toLowerCase().includes(q) || false;
          const matchNotes = d.notes?.toLowerCase().includes(q) || false;
          if (!matchPerson && !matchTitle && !matchItem && !matchProvider && !matchCategory && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'lateDays') {
          const lateA = calculateLateFeeAndOverdue(a).daysOverdue;
          const lateB = calculateLateFeeAndOverdue(b).daysOverdue;
          return lateB - lateA;
        }
        if (sortBy === 'dueDate') {
          if (a.status !== 'paid' && b.status === 'paid') return -1;
          if (a.status === 'paid' && b.status !== 'paid') return 1;
          const dueA = getNearestDueInfo(a.dueDayOfMonth, a.dueDate, a.status).dueDateStr;
          const dueB = getNearestDueInfo(b.dueDayOfMonth, b.dueDate, b.status).dueDateStr;
          const timeA = dueA ? new Date(dueA).getTime() : Infinity;
          const timeB = dueB ? new Date(dueB).getTime() : Infinity;
          return timeA - timeB;
        }
        if (sortBy === 'amount') {
          return b.remainingAmount - a.remainingAmount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [debts, activeTab, statusFilter, searchQuery, sortBy]);

  const toggleHistory = (debtId: string) => {
    setExpandedHistories((prev) => ({ ...prev, [debtId]: !prev[debtId] }));
  };

  // Open Payment for Regular or Installment
  const handleOpenPaymentModal = (debt: DebtRecord, monthNum?: number) => {
    setActivePaymentDebt(debt);
    const isInst = debt.type === 'installment' || debt.isInstallment;
    const late = calculateLateFeeAndOverdue(debt);

    if (late.isOverdue && late.totalLateFeePayable > 0) {
      setIncludeLateFee(true);
      setCustomLateFee(late.totalLateFeePayable);
      setWaiveLateFee(false);
    } else {
      setIncludeLateFee(false);
      setCustomLateFee(0);
      setWaiveLateFee(false);
    }

    if (isInst && debt.monthlyInstallment && debt.monthlyInstallment > 0) {
      // Default to 1 month installment amount or remaining amount if less
      const nextMonth = (debt.paidMonths || 0) + 1;
      setPayingMonthNumber(monthNum || nextMonth);
      setPaymentAmount(Math.min(debt.monthlyInstallment, debt.remainingAmount));
      
      const lateNote = late.isOverdue 
        ? ` (Telat ${late.daysOverdue} Hari)` 
        : '';
      setPaymentNotes(`Pembayaran Angsuran Bulan Ke-${monthNum || nextMonth}${lateNote}: ${debt.itemName || debt.title}`);
    } else {
      setPayingMonthNumber(undefined);
      setPaymentAmount(debt.remainingAmount);
      const lateNote = late.isOverdue ? ` (Telat ${late.daysOverdue} Hari)` : '';
      setPaymentNotes(
        debt.type === 'payable'
          ? `Cicilan pelunasan hutang${lateNote}: ${debt.title}`
          : `Penerimaan pelunasan piutang: ${debt.title}`
      );
    }

    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAccountId(accounts[0]?.id || '');
    setSyncWithTransaction(true);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!activePaymentDebt || paymentAmount <= 0) return;

    const isInst = activePaymentDebt.type === 'installment' || activePaymentDebt.isInstallment;
    const late = calculateLateFeeAndOverdue(activePaymentDebt, new Date(paymentDate));
    
    // Hitung denda yang dibayarkan dan yang dibebaskan
    const isLate = late.isOverdue;
    const daysLateCount = isLate ? late.daysOverdue : 0;
    const paidPenalty = (isLate && includeLateFee && !waiveLateFee) ? customLateFee : 0;
    const waivedPenalty = (isLate && waiveLateFee) ? (late.totalLateFeePayable || customLateFee) : 0;

    const newPaidAmount = activePaymentDebt.paidAmount + paymentAmount;
    const newRemainingAmount = Math.max(0, activePaymentDebt.totalAmount - newPaidAmount);
    const newStatus: DebtStatus = newRemainingAmount === 0 ? 'paid' : 'partial';

    // Calculate how many months this payment covers for installments
    let monthsCovered = 1;
    if (isInst && activePaymentDebt.monthlyInstallment && activePaymentDebt.monthlyInstallment > 0) {
      monthsCovered = Math.max(1, Math.round(paymentAmount / activePaymentDebt.monthlyInstallment));
    }

    let newPaidMonths = activePaymentDebt.paidMonths || 0;
    if (isInst) {
      if (payingMonthNumber && payingMonthNumber > newPaidMonths) {
        newPaidMonths = payingMonthNumber;
      } else {
        newPaidMonths = Math.min(activePaymentDebt.tenorMonths || 12, newPaidMonths + monthsCovered);
      }
      if (newRemainingAmount === 0 && activePaymentDebt.tenorMonths) {
        newPaidMonths = activePaymentDebt.tenorMonths;
      }
    }

    const currentMonthNum = isInst ? (payingMonthNumber || (activePaymentDebt.paidMonths || 0) + 1) : undefined;

    const newPaymentEntry: DebtPayment = {
      id: `pay-${Date.now()}`,
      date: paymentDate,
      amount: paymentAmount,
      lateFeePaid: paidPenalty > 0 ? paidPenalty : undefined,
      daysLate: daysLateCount > 0 ? daysLateCount : undefined,
      isLatePayment: isLate,
      waivedLateFee: waivedPenalty > 0 ? waivedPenalty : undefined,
      accountId: paymentAccountId,
      notes: paymentNotes.trim() || (isInst ? `Cicilan Bulan Ke-${currentMonthNum || newPaidMonths}${isLate ? ' (Telat)' : ''}` : 'Pembayaran angsuran'),
      monthNumber: currentMonthNum,
    };

    // Calculate next due date safely advancing by monthsCovered
    let newDueDate = activePaymentDebt.dueDate;
    if (isInst && newStatus !== 'paid' && activePaymentDebt.dueDayOfMonth) {
      const baseDate = activePaymentDebt.dueDate ? new Date(activePaymentDebt.dueDate) : new Date(paymentDate);
      const curY = baseDate.getFullYear();
      const curM = baseDate.getMonth();
      const targetM = curM + monthsCovered;
      const targetY = curY + Math.floor(targetM / 12);
      const normM = ((targetM % 12) + 12) % 12;
      const maxDays = new Date(targetY, normM + 1, 0).getDate();
      const validDay = Math.min(activePaymentDebt.dueDayOfMonth || 5, maxDays);
      const nextDue = new Date(targetY, normM, validDay);
      newDueDate = nextDue.toISOString().split('T')[0];
    }

    const updatedDebt: DebtRecord = {
      ...activePaymentDebt,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paidMonths: isInst ? newPaidMonths : activePaymentDebt.paidMonths,
      status: newStatus,
      dueDate: newDueDate,
      accumulatedLateFee: Math.max(0, (activePaymentDebt.accumulatedLateFee || 0) + (isLate && !includeLateFee && !waiveLateFee ? customLateFee : 0)),
      waivedLateFee: (activePaymentDebt.waivedLateFee || 0) + waivedPenalty,
      payments: [...(activePaymentDebt.payments || []), newPaymentEntry],
    };

    await onSaveDebt(updatedDebt);

    // Sync with financial transaction record linked to this payment
    if (syncWithTransaction && onAddTransaction && paymentAccountId) {
      const totalOutflow = paymentAmount + paidPenalty;

      if (activePaymentDebt.type === 'receivable') {
        // Terima Pelunasan Piutang -> Pemasukan Kas/Bank
        await onAddTransaction({
          date: paymentDate,
          title: `Pelunasan Piutang: ${activePaymentDebt.personName} (${activePaymentDebt.title})`,
          amount: paymentAmount,
          type: 'income',
          category: 'Hadiah & Bonus',
          accountId: paymentAccountId,
          notes: paymentNotes || `Penerimaan uang piutang dari ${activePaymentDebt.personName}`,
          source: 'manual',
        });
      } else {
        // Bayar Hutang / Kredit Barang -> Pengeluaran Kas/Bank (Termasuk Denda jika dibayar)
        const itemLabel = isInst
          ? `Bayar Cicilan: ${activePaymentDebt.itemName || activePaymentDebt.title} (Bln ${currentMonthNum || newPaidMonths}/${activePaymentDebt.tenorMonths || 12})${paidPenalty > 0 ? ` + Denda Rp ${formatRupiah(paidPenalty, false)}` : ''}`
          : `Bayar Hutang: ${activePaymentDebt.personName} (${activePaymentDebt.title})${paidPenalty > 0 ? ` + Denda Rp ${formatRupiah(paidPenalty, false)}` : ''}`;

        await onAddTransaction({
          date: paymentDate,
          title: itemLabel,
          amount: totalOutflow,
          type: 'expense',
          category: 'Tagihan & Utilitas',
          accountId: paymentAccountId,
          notes: paymentNotes || (isInst ? `Angsuran kredit ${activePaymentDebt.providerName || activePaymentDebt.personName}` : `Pembayaran hutang kepada ${activePaymentDebt.personName}`),
          source: 'manual',
        });
      }
    }

    setIsPaymentModalOpen(false);
    setActivePaymentDebt(null);
  };

  const handleOpenWhatsAppReminder = (debt: DebtRecord) => {
    if (!debt.contactPhone) {
      alert('Nomor kontak WhatsApp belum diisi untuk data piutang ini. Anda dapat mengeditnya terlebih dahulu.');
      return;
    }

    let cleanPhone = debt.contactPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const formattedAmount = formatCurrency(debt.remainingAmount);
    const dueText = debt.dueDate
      ? `yang jatuh tempo pada tanggal ${new Date(debt.dueDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`
      : 'sebelumnya';

    const message = encodeURIComponent(
      `Halo ${debt.personName}, mohon maaf mengganggu waktunya ya. 🙏\n\nSekadar mengingatkan terkait catatan pinjaman/talangan *${debt.title}* sebesar *${formattedAmount}* ${dueText}.\n\nJika sudah ada waktu luang untuk transfer atau ada hal yang perlu didiskusikan, silakan kabari saya ya. Terima kasih banyak!`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getDueStatusBadge = (debt: DebtRecord) => {
    const dueInfo = getNearestDueInfo(debt.dueDayOfMonth, debt.dueDate, debt.status, debt);

    if (dueInfo.statusType === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Lunas
        </span>
      );
    }

    if (!dueInfo.dueDateStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
          Tanpa Jatuh Tempo
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full ${dueInfo.badgeClass}`}>
        {dueInfo.statusType === 'today' || dueInfo.statusType === 'tomorrow' || dueInfo.statusType === 'overdue' ? (
          <Clock className="w-3 h-3 shrink-0" />
        ) : (
          <Calendar className="w-3 h-3 shrink-0" />
        )}
        <span>{dueInfo.statusLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kredit Barang & Cicilan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Kredit Barang Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            {formatCurrency(summary.totalInstallmentRemaining)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Sudah dicicil: {formatCurrency(summary.totalInstallmentPaid)}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{summary.activeInstallmentCount} Barang</span>
          </div>
        </div>

        {/* Card 2: Total Hutang Pinjaman (Kewajiban) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pinjaman / Hutang Tunai
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            {formatCurrency(summary.totalPayable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Sudah dicicil: {formatCurrency(summary.totalPaidPayable)}</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">Harus Dibayar</span>
          </div>
        </div>

        {/* Card 3: Total Piutang (Hak Tagih) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Piutang (Uang Dipinjamkan)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            {formatCurrency(summary.totalReceivable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span>Sudah diterima: {formatCurrency(summary.totalPaidReceivable)}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Akan Diterima</span>
          </div>
        </div>

        {/* Card 4: Posisi Bersih & Urgensi */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 dark:from-slate-800 dark:to-slate-900 text-white shadow-md relative overflow-hidden flex flex-col justify-between border border-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 dark:text-indigo-300 uppercase tracking-wider">
              Total Seluruh Kewajiban
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary.totalAllLiabilities)}
            </div>
            <div className="text-[11px] text-indigo-200/80 dark:text-indigo-300/80 mt-0.5 flex items-center gap-1">
              <span>Posisi Bersih:</span>
              <span className="font-bold">
                {summary.netBalance >= 0 ? `+${formatCurrency(summary.netBalance)}` : formatCurrency(summary.netBalance)}
              </span>
            </div>
          </div>
          {summary.urgentCount > 0 && (
            <div className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-1 rounded-lg flex items-center gap-1.5 w-fit">
              <AlertCircle className="w-3 h-3" />
              <span>{summary.urgentCount} cicilan jatuh tempo dekat</span>
            </div>
          )}
        </div>
      </div>

      {/* Sisa Kas Berjalan & Quick Actions Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Sisa Kas Berjalan
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Saldo Awal Rp 0 • Menyesuaikan seluruh pemasukan, pengeluaran & cicilan
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(cashSummary.currentSisaKas)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                (Total Masuk: <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiahShort(cashSummary.totalIncome)}</strong>, Keluar: <strong className="text-rose-600 dark:text-rose-400">{formatRupiahShort(cashSummary.totalExpense)}</strong>)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons for Explicit Types */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <button
            onClick={() => {
              setEditingDebt(null);
              setModalDefaultType('payable');
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            title="Tambah catatan hutang tunai baru"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Catat Hutang</span>
          </button>

          <button
            onClick={() => {
              setEditingDebt(null);
              setModalDefaultType('receivable');
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            title="Tambah catatan piutang uang baru"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Catat Piutang</span>
          </button>

          <button
            onClick={() => {
              setEditingDebt(null);
              setModalDefaultType('installment');
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            title="Tambah catatan cicilan / kredit barang baru"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Kredit Barang</span>
          </button>
        </div>
      </div>

      {/* View Switcher: List vs Calendar vs Monthly Credit Calculator */}
      <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setMainView('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Daftar Kredit & Hutang</span>
          </button>

          <button
            onClick={() => setMainView('calendar')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Kalender Pembayaran</span>
            <span className="hidden sm:inline-flex text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200 dark:border-indigo-800">
              Jatuh Tempo
            </span>
          </button>

          <button
            onClick={() => setMainView('monthly_calculator')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mainView === 'monthly_calculator'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Hitung Cicilan Tiap Bulan</span>
            <span className="hidden sm:inline-flex text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800">
              DSR
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditingDebt(null);
            setIsModalOpen(true);
          }}
          className="hidden sm:flex px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Catat Baru</span>
        </button>
      </div>

      {/* Render Sub View Based on Tab */}
      {mainView === 'calendar' ? (
        <PaymentCalendar
          debts={debts}
          accounts={accounts}
          transactions={transactions}
          onOpenPaymentModal={handleOpenPaymentModal}
          onOpenAddDebt={() => {
            setEditingDebt(null);
            setIsModalOpen(true);
          }}
          onOpenAddTransaction={() => {}}
        />
      ) : mainView === 'monthly_calculator' ? (
        <MonthlyCreditCalculator
          debts={debts}
          accounts={accounts}
          transactions={transactions}
          onOpenPaymentModal={handleOpenPaymentModal}
          onOpenAddInstallment={() => {
            setEditingDebt(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Action Banner: Kalkulator Simulasi Kredit Barang */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 rounded-3xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-700/50 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                <Calculator className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Kalkulator & Simulasi Kredit Barang
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Fitur Baru
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
                  Hitung estimasi angsuran per bulan (DP, tenor, bunga flat/admin), cek total selisih bunga, serta pantau progres berapa bulan cicilan yang sudah lunas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMainView('monthly_calculator')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>Lihat Beban Bulanan</span>
              </button>
              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-indigo-900 dark:text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-white" />
                <span>Simulasi Cicilan Baru</span>
              </button>
            </div>
          </div>

          {/* Control Bar: Filters, Search, and Add Button */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between transition-colors">
            {/* Left Side: Tab Type Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua ({debts.length})
              </button>
              <button
                onClick={() => setActiveTab('installment')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'installment' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Kredit Barang ({debts.filter((d) => d.type === 'installment' || d.isInstallment).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('payable')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeTab === 'payable' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Hutang Tunai ({debts.filter((d) => d.type === 'payable').length})</span>
              </button>
              <button
                onClick={() => setActiveTab('receivable')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  activeTab === 'receivable' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Piutang ({debts.filter((d) => d.type === 'receivable').length})</span>
              </button>
              {summary.overdueCount > 0 && (
                <button
                  onClick={() => setActiveTab('overdue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 animate-pulse ${
                    activeTab === 'overdue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Telat Bayar ({summary.overdueCount})</span>
                </button>
              )}
            </div>

            {/* Middle: Search & Filter */}
            <div className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari barang, lembaga (Kredivo/Spay), atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="unpaid">Belum Lunas</option>
                <option value="partial">Dicicil Sebagian</option>
                <option value="overdue">⚠️ Telat Bayar (Overdue)</option>
                <option value="paid">Sudah Lunas</option>
              </select>
            </div>

            {/* Right: Add Button */}
            <button
              onClick={() => {
                setEditingDebt(null);
                setIsModalOpen(true);
              }}
              className="w-full lg:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Catatan</span>
            </button>
          </div>

      {/* Debts & Installments List */}
      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum Ada Catatan Kredit / Hutang</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Gunakan fitur kredit barang untuk memantau angsuran gadget, kendaraan, paylater, atau pinjaman tunai Anda.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              🧮 Buka Simulasi Kredit
            </button>
            <button
              onClick={() => {
                setEditingDebt(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              + Buat Catatan Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((debt) => {
            const isInstallment = debt.type === 'installment' || debt.isInstallment;
            const isPayable = debt.type === 'payable';
            const isReceivable = debt.type === 'receivable';

            const lateInfo = calculateLateFeeAndOverdue(debt);
            const isOverdueDebt = debt.status !== 'paid' && lateInfo.isOverdue;

            const tenor = debt.tenorMonths || 12;
            const paidMonths = debt.paidMonths || 0;
            const remainingMonths = Math.max(0, tenor - paidMonths);
            const progressPercent =
              debt.totalAmount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) : 0;
            const isHistoryExpanded = expandedHistories[debt.id];

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                  debt.status === 'paid'
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 opacity-90'
                    : isOverdueDebt
                    ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-100 dark:ring-rose-950/40 bg-gradient-to-b from-rose-50/30 to-transparent dark:from-rose-950/20'
                    : isInstallment
                    ? 'border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                    : isPayable
                    ? 'border-rose-100 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700'
                    : 'border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <div>
                  {/* Top Row: Type, Provider & Due Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isOverdueDebt
                            ? 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300'
                            : isInstallment
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                            : isPayable
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isInstallment ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : isPayable ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isInstallment
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                : isPayable
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {isInstallment
                              ? 'Kredit / Cicilan Barang'
                              : isPayable
                              ? 'Hutang Tunai'
                              : 'Piutang Saya'}
                          </span>
                          {debt.category && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{debt.category}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
                          {debt.personName || debt.providerName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">{getDueStatusBadge(debt)}</div>
                  </div>

                  {/* Title / Item Name */}
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {isInstallment && <PackageCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      <span>{debt.itemName || debt.title}</span>
                    </div>
                    {debt.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 italic">"{debt.notes}"</p>
                    )}
                  </div>

                  {/* LATE PAYMENT & PENALTY ALERT BANNER */}
                  {isOverdueDebt && (
                    <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs animate-in fade-in">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-rose-950 dark:text-rose-200 block">
                              Terlambat Pembayaran {lateInfo.daysOverdue} Hari
                            </span>
                            <span className="text-[11px] text-rose-700 dark:text-rose-300">
                              Jatuh tempo: {lateInfo.dueDateFormatted}
                            </span>
                          </div>
                        </div>

                        {lateInfo.totalLateFeePayable > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-rose-500 block">
                              Denda Berjalan:
                            </span>
                            <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                              +{formatCurrency(lateInfo.totalLateFeePayable)}
                            </span>
                            {lateInfo.isCapped && lateInfo.maxLateFee && (
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-800 block mt-0.5">
                                🔒 Maks Denda
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {lateInfo.formulaExplanation && (
                        <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-rose-800 dark:text-rose-300">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{lateInfo.formulaExplanation}</span>
                          </span>
                          <span className="font-black text-rose-950 dark:text-rose-100 bg-white/70 dark:bg-rose-900/60 px-2 py-0.5 rounded-lg border border-rose-200/80">
                            Total Tagihan Langsung: {formatCurrency(lateInfo.totalWithLateFee)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SPECIAL SECTION: Item Installment Months Tracker */}
                  {isInstallment && (
                    <div className="mt-3.5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-indigo-950 dark:text-indigo-200">Status Cicilan:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                            Bulan ke-{paidMonths} dari {tenor} Bulan
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                          {remainingMonths === 0 ? '🎉 Lunas' : `Sisa ${remainingMonths} Bulan`}
                        </span>
                      </div>

                      {/* Visual Month Tracker Pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from({ length: tenor }).map((_, index) => {
                          const monthIdx = index + 1;
                          const isPaid = monthIdx <= paidMonths;
                          const isCurrentNext = monthIdx === paidMonths + 1;
                          const isOverduePill = isCurrentNext && isOverdueDebt;

                          return (
                            <div
                              key={monthIdx}
                              title={`Bulan ${monthIdx}: ${
                                isPaid
                                  ? 'Sudah Dibayar'
                                  : isOverduePill
                                  ? `Terlambat ${lateInfo.daysOverdue} Hari`
                                  : isCurrentNext
                                  ? 'Jatuh Tempo Berikutnya'
                                  : 'Belum Dibayar'
                              }`}
                              className={`h-6 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                isPaid
                                  ? 'bg-emerald-500 text-white shadow-2xs'
                                  : isOverduePill
                                  ? 'bg-rose-600 text-white border border-rose-700 ring-2 ring-rose-300 animate-pulse'
                                  : isCurrentNext
                                  ? 'bg-amber-400 text-amber-950 border border-amber-500 ring-2 ring-amber-300 animate-pulse'
                                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isPaid && <Check className="w-2.5 h-2.5" />}
                              {isOverduePill && <AlertTriangle className="w-2.5 h-2.5" />}
                              <span>Bln {monthIdx}</span>
                            </div>
                          );
                        })}
                      </div>

                      {debt.monthlyInstallment && debt.monthlyInstallment > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span>
                            Angsuran: <strong className="text-slate-900 dark:text-white">{formatCurrency(debt.monthlyInstallment)}</strong> / bln
                          </span>
                          {debt.dueDayOfMonth && (
                            <span className="text-slate-500 dark:text-slate-400">
                              Tiap tanggal <strong>{debt.dueDayOfMonth}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financial Metrics Box */}
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Sisa Kewajiban:</span>
                      <span
                        className={`font-black text-sm ${
                          debt.status === 'paid'
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : isInstallment
                            ? 'text-indigo-700 dark:text-indigo-400'
                            : isPayable
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Total: {formatCurrency(debt.totalAmount)}</span>
                      <span>Sudah Bayar: {formatCurrency(debt.paidAmount)}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          debt.status === 'paid'
                            ? 'bg-emerald-500'
                            : isInstallment
                            ? 'bg-indigo-600 dark:bg-indigo-500'
                            : isPayable
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
                      <span>Mulai: {debt.startDate ? formatDateIndo(debt.startDate) : '-'}</span>
                      {debt.status !== 'paid' ? (
                        <span className={`font-bold flex items-center gap-1 ${isOverdueDebt ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {isOverdueDebt ? <AlertTriangle className="w-3 h-3 text-rose-500" /> : <Calendar className="w-3 h-3 text-indigo-500" />}
                          <span>Jatuh tempo: {getNearestDueInfo(debt.dueDayOfMonth, debt.dueDate, debt.status).formattedDate}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Lunas</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Payment Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {debt.status !== 'paid' ? (
                      <button
                        onClick={() => handleOpenPaymentModal(debt)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer text-white ${
                          isOverdueDebt
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none animate-pulse'
                            : isInstallment
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'
                            : isPayable
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 dark:shadow-none'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>
                          {isInstallment
                            ? isOverdueDebt
                              ? `Bayar Cicilan (Telat ${lateInfo.daysOverdue} Hari)`
                              : `Bayar Cicilan Bln ke-${paidMonths + 1}`
                            : isPayable
                            ? isOverdueDebt
                              ? `Bayar Hutang (Telat ${lateInfo.daysOverdue} Hari)`
                              : 'Bayar Angsuran'
                            : 'Terima Pembayaran'}
                        </span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Kredit Telah Lunas Penuh</span>
                      </div>
                    )}

                    {/* WhatsApp Reminder (Piutang only) */}
                    {isReceivable && debt.status !== 'paid' && debt.contactPhone && (
                      <button
                        onClick={() => handleOpenWhatsAppReminder(debt)}
                        title="Kirim pengingat tagihan via WhatsApp"
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Edit & Delete Buttons */}
                    <button
                      onClick={() => {
                        setEditingDebt(debt);
                        setIsModalOpen(true);
                      }}
                      title="Edit data cicilan"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus catatan "${debt.title}"?`)) {
                          onDeleteDebt(debt.id);
                        }
                      }}
                      title="Hapus catatan"
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Notes & Memo Action Button */}
                  <button
                    onClick={() => handleOpenNotesModal(debt)}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                    title="Lihat & Tambah Catatan Hutang / Piutang"
                  >
                    <div className="flex items-center gap-1.5">
                      <NotebookPen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Catatan & Janji Bayar</span>
                      {debt.debtNotes && debt.debtNotes.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold">
                          {debt.debtNotes.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                      <Plus className="w-3 h-3" />
                      <span>Catatan</span>
                    </span>
                  </button>

                  {/* Excerpt of most recent note if exists */}
                  {debt.debtNotes && debt.debtNotes.length > 0 && (
                    <div
                      onClick={() => handleOpenNotesModal(debt)}
                      className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-[11px] cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                      title="Klik untuk membuka riwayat catatan lengkap"
                    >
                      <div className="flex items-center justify-between text-[10px] text-amber-800 dark:text-amber-300 font-bold mb-0.5">
                        <span className="flex items-center gap-1">
                          <StickyNote className="w-3 h-3 text-amber-600" />
                          <span>Catatan Terakhir ({formatDateIndo(debt.debtNotes[0].date)}):</span>
                        </span>
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                          {debt.debtNotes[0].category === 'janji_bayar' ? 'Janji Bayar' : debt.debtNotes[0].category === 'perjanjian' ? 'Perjanjian' : debt.debtNotes[0].category === 'konfirmasi' ? 'Konfirmasi' : debt.debtNotes[0].category === 'keringanan' ? 'Keringanan' : 'Catatan'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic font-medium">
                        "{debt.debtNotes[0].content}"
                      </p>
                    </div>
                  )}

                  {/* Payment History Accordion */}
                  {debt.payments && debt.payments.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleHistory(debt.id)}
                        className="w-full text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-between py-1 px-1 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <History className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          Riwayat Pembayaran ({debt.payments.length} transaksi)
                        </span>
                        <span>{isHistoryExpanded ? 'Sembunyikan ▲' : 'Lihat Detail ▼'}</span>
                      </button>

                      {isHistoryExpanded && (
                        <div className="mt-1.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {debt.payments.map((pay) => (
                            <div
                              key={pay.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                  {pay.monthNumber && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-extrabold">
                                      Bulan {pay.monthNumber}
                                    </span>
                                  )}
                                  <span>{formatCurrency(pay.amount)}</span>
                                  {pay.lateFeePaid && pay.lateFeePaid > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold flex items-center gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      +Denda {formatCurrency(pay.lateFeePaid)} ({pay.daysLate} hr)
                                    </span>
                                  )}
                                  {pay.waivedLateFee && pay.waivedLateFee > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold">
                                      Denda Dibebaskan
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{pay.notes || pay.date}</div>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{pay.date}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* MODAL: Payment / Angsuran Confirmation */}
      {isPaymentModalOpen && activePaymentDebt && (() => {
        const calculatedLateFeeInfo = calculateLateFeeAndOverdue(activePaymentDebt, new Date(paymentDate));
        return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {activePaymentDebt.type === 'installment' || activePaymentDebt.isInstallment
                    ? 'Bayar Angsuran Kredit Barang'
                    : activePaymentDebt.type === 'payable'
                    ? 'Catat Pembayaran Hutang'
                    : 'Catat Penerimaan Piutang'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activePaymentDebt.itemName || activePaymentDebt.title} • {activePaymentDebt.personName}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Balance Status */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total Kewajiban:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(activePaymentDebt.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Sudah Dibayar Sebelumnya:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(activePaymentDebt.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Sisa Pokok Belum Dibayar:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(activePaymentDebt.remainingAmount)}</span>
              </div>
              {(activePaymentDebt.type === 'installment' || activePaymentDebt.isInstallment) && (
                <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>Progres Angsuran:</span>
                  <span>
                    Bulan ke-{(activePaymentDebt.paidMonths || 0) + 1} dari {activePaymentDebt.tenorMonths || 12} Bulan
                  </span>
                </div>
              )}
            </div>

            {/* LATE PAYMENT & PENALTY CALCULATION BOX */}
            {calculatedLateFeeInfo && (calculatedLateFeeInfo.isOverdue || (calculatedLateFeeInfo.calculatedFee ?? 0) > 0 || ((activePaymentDebt.accumulatedLateFee || 0) > 0)) && (
              <div className="p-3.5 bg-rose-50/90 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/80 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Status Keterlambatan ({calculatedLateFeeInfo.daysOverdue} Hari)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 block">
                      Denda: {formatCurrency(calculatedLateFeeInfo.totalLateFeePayable)}
                    </span>
                    {calculatedLateFeeInfo.isCapped && calculatedLateFeeInfo.maxLateFee && (
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 inline-block">
                        🔒 Maksimal Denda (Cap {formatCurrency(calculatedLateFeeInfo.maxLateFee)})
                      </span>
                    )}
                  </div>
                </div>

                {calculatedLateFeeInfo.formulaExplanation && (
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 bg-white/70 dark:bg-rose-900/50 p-2 rounded-xl border border-rose-200/60">
                    💡 <strong>Perhitungan:</strong> {calculatedLateFeeInfo.formulaExplanation}
                  </p>
                )}

                {/* Late Fee Handling Options */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-200 cursor-pointer bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-rose-200/50">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-rose-500" />
                      <span>Hitung & Sertakan Denda Langsung</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={includeLateFee}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIncludeLateFee(checked);
                        if (checked) {
                          setWaiveLateFee(false);
                          setCustomLateFee(calculatedLateFeeInfo.totalLateFeePayable);
                        }
                      }}
                      className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                    />
                  </label>

                  {includeLateFee && (
                    <div className="pl-2 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                          Nominal Denda Dibayar:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={customLateFee}
                            onChange={(e) => setCustomLateFee(Math.max(0, Number(e.target.value)))}
                            className="w-28 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg font-bold text-rose-700 dark:text-rose-300 text-right"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomLateFee(calculatedLateFeeInfo.totalLateFeePayable)}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold px-1.5 py-1 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-md cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1 border-t border-rose-200/50">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Bebaskan / Hapus Denda (Keringanan)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={waiveLateFee}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWaiveLateFee(checked);
                        if (checked) {
                          setIncludeLateFee(false);
                          setCustomLateFee(0);
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Pokok Angsuran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">Rp</span>
                  <input
                    type="number"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="Contoh: 1500000"
                  />
                </div>

                {/* Quick Payment Action Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activePaymentDebt.monthlyInstallment && activePaymentDebt.monthlyInstallment > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(activePaymentDebt.monthlyInstallment || 0, activePaymentDebt.remainingAmount);
                          setPaymentAmount(val);
                          const nextM = (activePaymentDebt.paidMonths || 0) + 1;
                          setPayingMonthNumber(nextM);
                          setPaymentNotes(`Pembayaran Angsuran Bulan Ke-${nextM}: ${activePaymentDebt.itemName || activePaymentDebt.title}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer border border-indigo-200/50 text-left"
                      >
                        <div>1 Bulan Cicilan ({formatCurrency(activePaymentDebt.monthlyInstallment)})</div>
                        {includeLateFee && customLateFee > 0 && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">
                            + Denda Langsung = {formatCurrency(Math.min(activePaymentDebt.monthlyInstallment || 0, activePaymentDebt.remainingAmount) + customLateFee)}
                          </div>
                        )}
                      </button>

                      {activePaymentDebt.remainingAmount >= (activePaymentDebt.monthlyInstallment * 2) && (
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.min((activePaymentDebt.monthlyInstallment || 0) * 2, activePaymentDebt.remainingAmount);
                            setPaymentAmount(val);
                            const nextM = (activePaymentDebt.paidMonths || 0) + 2;
                            setPayingMonthNumber(nextM);
                            setPaymentNotes(`Pembayaran Angsuran 2 Bulan (Bln ${(activePaymentDebt.paidMonths || 0) + 1}-${nextM}): ${activePaymentDebt.itemName || activePaymentDebt.title}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer border border-indigo-200/50 text-left"
                        >
                          <div>2 Bulan ({formatCurrency(activePaymentDebt.monthlyInstallment * 2)})</div>
                          {includeLateFee && customLateFee > 0 && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">
                              + Denda Langsung = {formatCurrency((activePaymentDebt.monthlyInstallment * 2) + customLateFee)}
                            </div>
                          )}
                        </button>
                      )}
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(activePaymentDebt.remainingAmount);
                      setPayingMonthNumber(activePaymentDebt.tenorMonths);
                      setPaymentNotes(`Pelunasan Penuh: ${activePaymentDebt.itemName || activePaymentDebt.title}`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-colors cursor-pointer border border-emerald-200/50 text-left"
                  >
                    <div>Lunaskan Pokok ({formatCurrency(activePaymentDebt.remainingAmount)})</div>
                    {includeLateFee && customLateFee > 0 && (
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold">
                        + Denda Langsung = {formatCurrency(activePaymentDebt.remainingAmount + customLateFee)}
                      </div>
                    )}
                  </button>
                </div>

                {/* Live Summary of Total Deduction (Pokok + Denda) */}
                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/70 dark:to-purple-950/70 border-2 border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Pokok Angsuran Dibayar:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(paymentAmount)}</span>
                  </div>
                  {includeLateFee && customLateFee > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>Denda Keterlambatan:</span>
                      </span>
                      <span>+{formatCurrency(customLateFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-indigo-200/80 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200">
                    <div>
                      <span className="block font-black text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                        Total Harus Dibayar Langsung:
                      </span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        (Pokok {formatCurrency(paymentAmount)} {includeLateFee && customLateFee > 0 ? `+ Denda ${formatCurrency(customLateFee)}` : ''})
                      </span>
                    </div>
                    <span className="text-base font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-indigo-300 dark:border-indigo-700 shadow-xs">
                      {formatCurrency(paymentAmount + (includeLateFee ? customLateFee : 0))}
                    </span>
                  </div>
                </div>

                {/* Live Preview of After Payment State */}
                {paymentAmount > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span>Sisa Pokok Setelah Bayar:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Math.max(0, activePaymentDebt.remainingAmount - paymentAmount))}
                      </span>
                    </div>
                    {paymentAmount >= activePaymentDebt.remainingAmount && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kewajiban ini akan otomatis berstatus LUNAS.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activePaymentDebt.type === 'receivable' ? 'Rekening Penampung (Pemasukan)' : 'Rekening Sumber Dana (Pengeluaran)'}
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan Transaksi</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  placeholder="Contoh: Autodebet m-BCA / Transfer manual"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between">
                <div className="text-[11px]">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 block">Otomatis Sinkron ke Catatan Transaksi</span>
                  <span className="text-indigo-700 dark:text-indigo-400">
                    {activePaymentDebt.type === 'receivable'
                      ? 'Catat transaksi pemasukan & tambah saldo rekening'
                      : 'Catat transaksi pengeluaran & potong saldo rekening'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={syncWithTransaction}
                  onChange={(e) => setSyncWithTransaction(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={paymentAmount <= 0}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 dark:shadow-none transition-all cursor-pointer disabled:opacity-50"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL: Full Form Modal (Tambah/Edit Kredit & Hutang) */}
      <DebtFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDebt(null);
          setModalDefaultType(undefined);
        }}
        onSave={onSaveDebt}
        editingDebt={editingDebt}
        defaultType={modalDefaultType}
        accounts={accounts}
        onAddTransaction={onAddTransaction}
      />

      {/* MODAL: Catatan & Memo Khusus Hutang & Piutang (Debt Notes) */}
      <DebtNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => {
          setIsNotesModalOpen(false);
          setActiveNotesDebt(null);
        }}
        debt={activeNotesDebt}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
      />

      {/* MODAL: Kalkulator Simulasi Kredit Barang Interaktif */}
      <InstallmentCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onSaveInstallment={onSaveDebt}
        accounts={accounts}
      />
    </div>
  );
};

/* =========================================================================
   KOMPONEN MODAL: KALKULATOR SIMULASI KREDIT BARANG INTERAKTIF
   ========================================================================= */
interface InstallmentCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInstallment: (debt: DebtRecord) => Promise<void>;
  accounts: Account[];
}

const InstallmentCalculatorModal: React.FC<InstallmentCalculatorModalProps> = ({
  isOpen,
  onClose,
  onSaveInstallment,
  accounts,
}) => {
  const [itemName, setItemName] = useState('iPhone 15 Pro 256GB');
  const [providerName, setProviderName] = useState('SpayLater (Shopee)');
  const [cashPrice, setCashPrice] = useState<number>(20999000);
  const [downPayment, setDownPayment] = useState<number>(2999000);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [interestRatePercent, setInterestRatePercent] = useState<number>(1.2); // per bulan
  const [adminFeeMonthly, setAdminFeeMonthly] = useState<number>(25000);
  const [paidMonthsInitial, setPaidMonthsInitial] = useState<number>(0);
  const [dueDay, setDueDay] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Calculation Math
  const principalLoan = Math.max(0, cashPrice - downPayment);
  const monthlyPrincipal = tenorMonths > 0 ? principalLoan / tenorMonths : 0;
  const monthlyInterest = principalLoan * (interestRatePercent / 100);
  const totalMonthlyInstallment = Math.round(monthlyPrincipal + monthlyInterest + adminFeeMonthly);
  const totalLoanInterest = Math.round(monthlyInterest * tenorMonths);
  const totalAdminFee = adminFeeMonthly * tenorMonths;
  const totalRepaymentAmount = totalMonthlyInstallment * tenorMonths;
  const totalCost = downPayment + totalRepaymentAmount;
  const creditDifference = totalCost - cashPrice;

  const currentPaidAmount = totalMonthlyInstallment * paidMonthsInitial;
  const currentRemainingAmount = Math.max(0, totalRepaymentAmount - currentPaidAmount);
  const remainingMonths = Math.max(0, tenorMonths - paidMonthsInitial);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleSaveToDebtList = async () => {
    if (!itemName.trim() || cashPrice <= 0 || tenorMonths <= 0) {
      alert('Mohon lengkapi nama barang, harga, dan tenor cicilan.');
      return;
    }

    const calculatedDueDate = calculateNearestDueDate(dueDay);

    const newRecord: DebtRecord = {
      id: `debt-inst-${Date.now()}`,
      type: 'installment',
      isInstallment: true,
      itemName: itemName.trim(),
      providerName: providerName.trim() || 'Cicilan Toko/Lembaga',
      personName: providerName.trim() || 'Cicilan Toko/Lembaga',
      title: `Kredit ${itemName.trim()}`,
      originalPrice: cashPrice,
      downPayment: downPayment,
      tenorMonths: tenorMonths,
      paidMonths: paidMonthsInitial,
      monthlyInstallment: totalMonthlyInstallment,
      interestRatePercent: interestRatePercent,
      adminFee: adminFeeMonthly,
      dueDayOfMonth: dueDay,
      totalAmount: totalRepaymentAmount,
      paidAmount: currentPaidAmount,
      remainingAmount: currentRemainingAmount,
      startDate: startDate,
      dueDate: calculatedDueDate,
      status: currentRemainingAmount === 0 ? 'paid' : paidMonthsInitial > 0 ? 'partial' : 'unpaid',
      category: 'Kredit Gadget & Elektronik',
      notes: `Cicilan ${itemName} via ${providerName} (Tenor ${tenorMonths} Bulan @ ${formatCurrency(totalMonthlyInstallment)}/bln). Bunga ${interestRatePercent}%/bln.`,
      payments: paidMonthsInitial > 0
        ? Array.from({ length: paidMonthsInitial }).map((_, idx) => ({
            id: `pay-init-${idx + 1}`,
            date: startDate,
            amount: totalMonthlyInstallment,
            accountId: accounts[0]?.id || 'acc-cash',
            notes: `Cicilan Bulan Ke-${idx + 1}`,
            monthNumber: idx + 1,
          }))
        : [],
      createdAt: new Date().toISOString(),
    };

    await onSaveInstallment(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Kalkulator Simulasi Kredit Barang</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitung angsuran bulanan, bunga, dan pantau progres berapa bulan cicilan sudah dibayar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Item Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Barang / Produk</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
              placeholder="Contoh: iPhone 15, Honda Vario, Laptop ASUS"
            />
          </div>

          {/* Provider / Merchant */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Penyedia Cicilan / PayLater</label>
            <div className="space-y-1">
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                placeholder="SpayLater, Kredivo, BCA Cicilan, Akulaku"
              />
              <div className="flex flex-wrap gap-1">
                {['SpayLater', 'Kredivo', 'Akulaku', 'BCA Cicilan 0%', 'Home Credit', 'FIF'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProviderName(p)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-md transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cash Price */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Harga Asli Barang (Cash Price)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">Rp</span>
              <input
                type="number"
                value={cashPrice || ''}
                onChange={(e) => setCashPrice(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                placeholder="20999000"
              />
            </div>
          </div>

          {/* Down Payment (DP) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Uang Muka / DP (Jika Ada)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">Rp</span>
              <input
                type="number"
                value={downPayment || ''}
                onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                placeholder="0 jika tanpa DP"
              />
            </div>
          </div>

          {/* Tenor (Durasi Bulan) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tenor Cicilan (Durasi Bulan)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[3, 6, 9, 12, 18, 24, 36].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenorMonths(t)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    tenorMonths === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t} Bln
                </button>
              ))}
            </div>
          </div>

          {/* Suku Bunga & Biaya Admin */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bunga (%/bln)</label>
              <input
                type="number"
                step="0.1"
                value={interestRatePercent}
                onChange={(e) => setInterestRatePercent(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                placeholder="1.2 (0 jika 0%)"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admin / Bln (Rp)</label>
              <input
                type="number"
                value={adminFeeMonthly || ''}
                onChange={(e) => setAdminFeeMonthly(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                placeholder="25000"
              />
            </div>
          </div>

          {/* Already Paid Months (Tracking Bulan yang Sudah Dibayar) */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
            <label className="block font-bold text-emerald-950 dark:text-emerald-300 mb-1">
              Sudah Berapa Bulan yang Sudah Dibayar?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={tenorMonths}
                value={paidMonthsInitial}
                onChange={(e) => setPaidMonthsInitial(Math.min(tenorMonths, Math.max(0, Number(e.target.value))))}
                className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-center text-sm text-emerald-800 dark:text-emerald-300"
              />
              <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                dari {tenorMonths} Bulan (Sisa {remainingMonths} Bulan Lagi)
              </span>
            </div>
          </div>

          {/* Due Day & Start Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tgl Jatuh Tempo Tiap Bln</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Mulai Cicil</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* RESULTS CALCULATION BOX */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-slate-800 dark:to-slate-950 text-white space-y-3 shadow-md border border-indigo-700/50 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-indigo-700/60 dark:border-slate-700 pb-2">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              Hasil Simulasi Angsuran
            </span>
            <span className="text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
              Tenor {tenorMonths} Bulan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-indigo-200/70 block text-[11px]">Angsuran per Bulan:</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(totalMonthlyInstallment)}
                <span className="text-xs font-normal text-indigo-300"> / bulan</span>
              </span>
            </div>
            <div>
              <span className="text-indigo-200/70 block text-[11px]">Status Pembayaran Saat Ini:</span>
              <span className="text-base font-bold text-emerald-400">
                {paidMonthsInitial} / {tenorMonths} Bulan Terbayar ({formatCurrency(currentPaidAmount)})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-700/60 dark:border-slate-700 text-[11px]">
            <div>
              <span className="text-indigo-300">Pokok Hutang:</span>
              <div className="font-bold text-white">{formatCurrency(principalLoan)}</div>
            </div>
            <div>
              <span className="text-indigo-300">Total Bunga:</span>
              <div className="font-bold text-amber-300">{formatCurrency(totalLoanInterest)}</div>
            </div>
            <div>
              <span className="text-indigo-300">Total Biaya Kredit:</span>
              <div className="font-bold text-white">{formatCurrency(totalCost)}</div>
            </div>
            <div>
              <span className="text-indigo-300">Selisih vs Cash:</span>
              <div className="font-bold text-rose-300">+{formatCurrency(creditDifference)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSaveToDebtList}
            className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Simpan ke Daftar Cicilan Saya</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   KOMPONEN FORM MODAL (TAMBAH / EDIT KREDIT & HUTANG PIUTANG LENGKAP)
   ========================================================================= */
interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: DebtRecord) => Promise<void>;
  editingDebt: DebtRecord | null;
  defaultType?: DebtType;
  accounts: Account[];
  onAddTransaction?: (tx: Omit<Transaction, 'id'>) => Promise<void>;
}

const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDebt,
  defaultType,
  accounts,
  onAddTransaction,
}) => {
  const [type, setType] = useState<DebtType>('installment');
  const [itemName, setItemName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [personName, setPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [paidMonths, setPaidMonths] = useState<number>(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Kredit Gadget & Elektronik');
  const [notes, setNotes] = useState('');
  const [recordInitialTransaction, setRecordInitialTransaction] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  // Late Fee Configuration State
  const [hasLateFeeRule, setHasLateFeeRule] = useState(true);
  const [lateFeeType, setLateFeeType] = useState<'daily_fixed' | 'daily_percent' | 'monthly_percent' | 'monthly_fixed'>('daily_percent');
  const [lateFeeValue, setLateFeeValue] = useState<number>(0.2);
  const [maxLateFee, setMaxLateFee] = useState<number | undefined>(200000);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(0);

  // Synchronize state when editingDebt changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingDebt) {
        const dType = editingDebt.type || (editingDebt.isInstallment ? 'installment' : 'payable');
        const day = editingDebt.dueDayOfMonth || 5;
        setType(dType);
        setItemName(editingDebt.itemName || '');
        setProviderName(editingDebt.providerName || '');
        setPersonName(editingDebt.personName || '');
        setContactPhone(editingDebt.contactPhone || '');
        setTitle(editingDebt.title || '');
        setTotalAmount(editingDebt.totalAmount || 0);
        setPaidAmount(editingDebt.paidAmount || 0);
        setTenorMonths(editingDebt.tenorMonths || 12);
        setPaidMonths(editingDebt.paidMonths || 0);
        setMonthlyInstallment(
          editingDebt.monthlyInstallment ||
          (editingDebt.totalAmount && editingDebt.tenorMonths
            ? Math.round(editingDebt.totalAmount / editingDebt.tenorMonths)
            : 0)
        );
        setDueDayOfMonth(day);
        setStartDate(editingDebt.startDate || new Date().toISOString().split('T')[0]);
        setDueDate(editingDebt.dueDate || calculateNearestDueDate(day));
        setCategory(editingDebt.category || (dType === 'installment' ? 'Kredit Gadget & Elektronik' : dType === 'payable' ? 'Cicilan Bank' : 'Pinjaman Teman'));
        setNotes(editingDebt.notes || '');
        setRecordInitialTransaction(false);

        // Late fee fields
        setHasLateFeeRule(editingDebt.hasLateFeeRule ?? true);
        setLateFeeType(editingDebt.lateFeeType || 'daily_percent');
        setLateFeeValue(editingDebt.lateFeeValue !== undefined ? editingDebt.lateFeeValue : 0.2);
        setMaxLateFee(editingDebt.maxLateFee);
        setGracePeriodDays(editingDebt.gracePeriodDays || 0);
      } else {
        const initType = defaultType || 'installment';
        setType(initType);
        setItemName('');
        setProviderName('');
        setPersonName('');
        setContactPhone('');
        setTitle('');
        setTotalAmount(0);
        setPaidAmount(0);
        setTenorMonths(12);
        setPaidMonths(0);
        setMonthlyInstallment(0);
        setDueDayOfMonth(5);
        setStartDate(new Date().toISOString().split('T')[0]);
        setDueDate(calculateNearestDueDate(5));
        setCategory(
          initType === 'installment'
            ? 'Kredit Gadget & Elektronik'
            : initType === 'payable'
            ? 'Cicilan Bank'
            : 'Pinjaman Teman'
        );
        setNotes('');
        setRecordInitialTransaction(false);

        // Default late fee enabled for installment
        setHasLateFeeRule(initType === 'installment');
        setLateFeeType('daily_percent');
        setLateFeeValue(0.2);
        setMaxLateFee(200000);
        setGracePeriodDays(0);
      }
      setSelectedAccountId(accounts[0]?.id || '');
    }
  }, [editingDebt, isOpen, defaultType, accounts]);

  // Auto calculate remaining based on paid months or paid amount
  const handleTenorOrMonthsChange = (newTenor: number, newPaidMonths: number, monthly: number) => {
    setTenorMonths(newTenor);
    setPaidMonths(newPaidMonths);
    if (monthly > 0) {
      const calcTotal = monthly * newTenor;
      const calcPaid = monthly * newPaidMonths;
      setTotalAmount(calcTotal);
      setPaidAmount(calcPaid);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle = title.trim() || itemName.trim() || 'Kredit Barang';
    const effectivePerson = personName.trim() || providerName.trim() || 'Pihak Terkait';

    if (totalAmount <= 0) {
      alert('Harap masukkan nominal total kewajiban cicilan.');
      return;
    }

    const calculatedRemaining = Math.max(0, totalAmount - paidAmount);
    const calculatedStatus: DebtStatus = calculatedRemaining === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const isInst = type === 'installment';

    const debtData: DebtRecord = {
      ...(editingDebt || {}),
      id: editingDebt?.id || `debt-${Date.now()}`,
      type,
      isInstallment: isInst,
      itemName: itemName.trim() || undefined,
      providerName: providerName.trim() || undefined,
      personName: effectivePerson,
      contactPhone: contactPhone.trim() || undefined,
      title: effectiveTitle,
      totalAmount,
      paidAmount,
      remainingAmount: calculatedRemaining,
      tenorMonths: isInst ? tenorMonths : undefined,
      paidMonths: isInst ? paidMonths : undefined,
      monthlyInstallment: isInst ? (monthlyInstallment || Math.round(totalAmount / (tenorMonths || 12))) : undefined,
      dueDayOfMonth: isInst ? dueDayOfMonth : undefined,
      startDate,
      dueDate: dueDate || undefined,
      status: calculatedStatus,
      category,
      notes: notes.trim() || undefined,
      hasLateFeeRule,
      lateFeeType: hasLateFeeRule ? lateFeeType : undefined,
      lateFeeValue: hasLateFeeRule ? lateFeeValue : undefined,
      maxLateFee: hasLateFeeRule && maxLateFee && maxLateFee > 0 ? maxLateFee : undefined,
      gracePeriodDays: hasLateFeeRule ? gracePeriodDays : undefined,
      payments: editingDebt?.payments || [],
      createdAt: editingDebt?.createdAt || new Date().toISOString(),
    };

    await onSave(debtData);

    // Initial transaction recording
    if (!editingDebt && recordInitialTransaction && onAddTransaction && selectedAccountId) {
      if (type === 'payable') {
        // Saya meminjam uang -> Dana masuk ke rekening saya (Income / Pinjaman)
        await onAddTransaction({
          date: startDate,
          title: `Pencairan Pinjaman: ${effectivePerson} (${effectiveTitle})`,
          amount: totalAmount,
          type: 'income',
          category: 'Hadiah & Bonus',
          accountId: selectedAccountId,
          notes: `Dana pinjaman dari ${effectivePerson}`,
          source: 'manual',
        });
      } else if (type === 'receivable') {
        // Saya meminjamkan uang ke orang -> Saldo rekening saya keluar (Expense / Talangan)
        await onAddTransaction({
          date: startDate,
          title: `Talangan / Pinjaman ke: ${effectivePerson} (${effectiveTitle})`,
          amount: totalAmount,
          type: 'expense',
          category: 'Tagihan & Utilitas',
          accountId: selectedAccountId,
          notes: `Pinjaman dana ke ${effectivePerson}`,
          source: 'manual',
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingDebt ? 'Edit Catatan Kewajiban / Kredit' : 'Tambah Catatan Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih tipe kredit barang, hutang pinjaman, atau piutang.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Type Selector (3 options) */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('installment');
                setCategory('Kredit Gadget & Elektronik');
              }}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                type === 'installment'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Kredit Barang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('payable');
                setCategory('Cicilan Bank');
              }}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                type === 'payable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Hutang Tunai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('receivable');
                setCategory('Pinjaman Teman');
              }}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                type === 'receivable'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Piutang Saya</span>
            </button>
          </div>

          {/* Conditional Fields based on Type */}
          {type === 'installment' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Barang / Produk</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
                    placeholder="Contoh: iPhone 15 Pro, Honda Beat"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lembaga / PayLater</label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={(e) => {
                      setProviderName(e.target.value);
                      setPersonName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    placeholder="SpayLater, Kredivo, BCA"
                  />
                </div>
              </div>

              {/* Installment Months Math */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-indigo-950 dark:text-indigo-200 mb-1">Tenor (Bulan)</label>
                    <input
                      type="number"
                      min="1"
                      value={tenorMonths}
                      onChange={(e) =>
                        handleTenorOrMonthsChange(
                          Number(e.target.value),
                          paidMonths,
                          monthlyInstallment
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">Sudah Dibayar</label>
                    <input
                      type="number"
                      min="0"
                      max={tenorMonths}
                      value={paidMonths}
                      onChange={(e) =>
                        handleTenorOrMonthsChange(
                          tenorMonths,
                          Number(e.target.value),
                          monthlyInstallment
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800 dark:text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-indigo-950 dark:text-indigo-200 mb-1">Cicilan / Bulan</label>
                    <input
                      type="number"
                      value={monthlyInstallment || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMonthlyInstallment(val);
                        handleTenorOrMonthsChange(tenorMonths, paidMonths, val);
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 dark:text-indigo-400"
                      placeholder="1680000"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-indigo-900 dark:text-indigo-300 flex justify-between font-semibold">
                  <span>
                    Status: <strong>Bulan ke-{paidMonths} dari {tenorMonths}</strong>
                  </span>
                  <span>
                    Sisa: <strong>{Math.max(0, tenorMonths - paidMonths)} Bulan Lagi</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {type === 'payable' ? 'Pemberi Pinjaman / Bank' : 'Nama Peminjam'}
                </label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                  placeholder={type === 'payable' ? 'Contoh: Bank BCA / KTA' : 'Contoh: Budi Santoso'}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">No. HP / WhatsApp</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  placeholder="08123456789"
                />
              </div>
            </div>
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keperluan / Keterangan</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                placeholder="Contoh: Cicilan iPhone / Talangan Tiket"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="Kredit Gadget & Elektronik">Kredit Gadget & Elektronik</option>
                <option value="Kredit Kendaraan Bermotor">Kredit Kendaraan Bermotor</option>
                <option value="PayLater & E-Commerce">PayLater & E-Commerce</option>
                <option value="Cicilan Bank & KTA">Cicilan Bank & KTA</option>
                <option value="Pinjaman Teman / Keluarga">Pinjaman Teman / Keluarga</option>
                <option value="Talangan Kantor">Talangan Kantor</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
          </div>

          {/* Amount Box */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Kewajiban (Rp)</label>
              <input
                type="number"
                required
                value={totalAmount || ''}
                onChange={(e) => setTotalAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 dark:text-white"
                placeholder="20160000"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sudah Dibayar (Rp)</label>
              <input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-emerald-700 dark:text-emerald-400"
                placeholder="0"
              />
            </div>
          </div>

          {/* Due Day of Month for Installment */}
          {type === 'installment' && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  Tanggal Jatuh Tempo Tiap Bulan (Tgl 1 - 31)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nearest = calculateNearestDueDate(dueDayOfMonth);
                    setDueDate(nearest);
                  }}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Hitung Jatuh Tempo Terdekat</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDayOfMonth}
                  onChange={(e) => {
                    const d = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                    setDueDayOfMonth(d);
                    setDueDate(calculateNearestDueDate(d));
                  }}
                  className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-center text-sm text-indigo-700 dark:text-indigo-300"
                />
                <div className="flex flex-wrap gap-1 flex-1">
                  {[1, 5, 10, 15, 20, 25, 28, 30].map((dayNum) => (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        setDueDayOfMonth(dayNum);
                        setDueDate(calculateNearestDueDate(dayNum));
                      }}
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        dueDayOfMonth === dayNum
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      Tgl {dayNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  {type === 'installment' ? 'Jatuh Tempo Terdekat' : 'Tanggal Jatuh Tempo'}
                </label>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Due date preview helper */}
          {dueDate && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Jatuh tempo: <strong className="text-slate-900 dark:text-white">{formatDateFull(dueDate)}</strong></span>
              </div>
              {(() => {
                const info = getNearestDueInfo(dueDayOfMonth, dueDate, 'unpaid');
                return (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.badgeClass}`}>
                    {info.statusLabel}
                  </span>
                );
              })()}
            </div>
          )}

          {/* LATE FEE CONFIGURATION SECTION */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    Fitur Denda & Keterlambatan Pembayaran
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Otomatis hitung denda jika pembayaran melewati jatuh tempo
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasLateFeeRule}
                onChange={(e) => setHasLateFeeRule(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {hasLateFeeRule && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5 animate-in fade-in text-xs">
                {/* Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Preset Aturan Denda Populer:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {LATE_FEE_PRESETS.map((preset) => (
                      <button
                        key={preset.id || preset.name}
                        type="button"
                        onClick={() => {
                          setLateFeeType(preset.type);
                          setLateFeeValue(preset.value);
                          setGracePeriodDays(preset.gracePeriod);
                          setMaxLateFee(preset.maxLateFee);
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Denda</label>
                    <select
                      value={lateFeeType}
                      onChange={(e) => setLateFeeType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                    >
                      <option value="daily_percent">Persentase Harian (% / hari)</option>
                      <option value="daily_fixed">Nominal Tetap Harian (Rp / hari)</option>
                      <option value="monthly_percent">Persentase Bulanan (% / bulan)</option>
                      <option value="monthly_fixed">Nominal Tetap Bulanan (Rp / bulan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {lateFeeType.includes('percent') ? 'Nilai Persentase (%)' : 'Nominal Denda (Rp)'}
                    </label>
                    <input
                      type="number"
                      step={lateFeeType.includes('percent') ? '0.01' : '1000'}
                      value={lateFeeValue || ''}
                      onChange={(e) => setLateFeeValue(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                      placeholder={lateFeeType.includes('percent') ? '0.2' : '5000'}
                    />
                  </div>
                </div>

                {/* Maksimal Denda & Masa Tenggang */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        Maksimal Denda (Rp)
                      </label>
                    </div>
                    <input
                      type="number"
                      step="5000"
                      value={maxLateFee !== undefined ? maxLateFee : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                        setMaxLateFee(val);
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                      placeholder="Opsional (tanpa batas)"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Toleransi / Grace Period
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                      placeholder="0 Hari"
                    />
                  </div>
                </div>

                {/* Quick Max Late Fee Pills */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-0.5">Pilihan Maks Denda:</span>
                  <button
                    type="button"
                    onClick={() => setMaxLateFee(undefined)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      maxLateFee === undefined
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    Tanpa Batas
                  </button>
                  {[50000, 100000, 200000, 500000].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setMaxLateFee(cap)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        maxLateFee === cap
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      Rp {formatRupiah(cap, false)}
                    </button>
                  ))}
                  {monthlyInstallment > 0 && (
                    <button
                      type="button"
                      onClick={() => setMaxLateFee(monthlyInstallment)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        maxLateFee === monthlyInstallment
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      1x Cicilan ({formatRupiah(monthlyInstallment, false)})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              placeholder="Nomor kontrak cicilan / catatan penting"
            />
          </div>

          {/* Sync initial transaction option (only for new loan creation) */}
          {!editingDebt && type !== 'installment' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Catat Transaksi Pencairan Sekarang</span>
                <input
                  type="checkbox"
                  checked={recordInitialTransaction}
                  onChange={(e) => setRecordInitialTransaction(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
              {recordInitialTransaction && (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   KOMPONEN MODAL: CATATAN & MEMO KHUSUS HUTANG / PIUTANG (DEBT NOTES)
   ========================================================================= */
interface DebtNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  onSaveNote: (debtId: string, noteData: Omit<DebtNote, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNote: (debtId: string, noteId: string) => Promise<void>;
}

export const DebtNotesModal: React.FC<DebtNotesModalProps> = ({
  isOpen,
  onClose,
  debt,
  onSaveNote,
  onDeleteNote,
}) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'perjanjian' | 'janji_bayar' | 'konfirmasi' | 'keringanan' | 'umum'>('umum');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !debt) return null;

  const notesList = debt.debtNotes || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveNote(debt.id, {
        content: content.trim(),
        category,
        date,
      });
      setContent('');
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (noteText: string, noteId: string) => {
    navigator.clipboard.writeText(noteText);
    setCopiedId(noteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'perjanjian':
        return { label: '🤝 Perjanjian / Surat', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'janji_bayar':
        return { label: '⏱️ Janji Bayar / Komitmen', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'konfirmasi':
        return { label: '💬 Konfirmasi WA / Bukti', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'keringanan':
        return { label: '🏷️ Keringanan / Diskon', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      default:
        return { label: '📝 Catatan Umum', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 transition-colors">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <NotebookPen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {debt.type === 'installment' ? 'Kredit Barang' : debt.type === 'payable' ? 'Hutang Tunai' : 'Piutang Saya'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {debt.personName || debt.providerName}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                Catatan & Memo: {debt.itemName || debt.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Tambah Catatan Baru */}
        <form onSubmit={handleAdd} className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Tambah Catatan / Janji Bayar Baru</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Tersimpan ke Cloud</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Catatan
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                <option value="umum">📝 Catatan Umum</option>
                <option value="janji_bayar">⏱️ Janji Bayar / Komitmen</option>
                <option value="perjanjian">🤝 Surat & Perjanjian</option>
                <option value="konfirmasi">💬 Konfirmasi WA / Bukti</option>
                <option value="keringanan">🏷️ Diskon / Keringanan Denda</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Catatan
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Isi Catatan / Memo
            </label>
            <textarea
              required
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis detail catatan, perjanjian perpanjangan waktu, nomor resi/kontrak, hasil telepon/WA, atau janji bayar..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan Catatan</span>
            </button>
          </div>
        </form>

        {/* Timeline Riwayat Catatan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Daftar Catatan Terlampir ({notesList.length})</span>
            </span>
          </div>

          {notesList.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <StickyNote className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold">Belum ada catatan khusus.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tambahkan catatan di form atas untuk mendokumentasikan komitmen, nomor invoice, atau janji pelunasan.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {notesList.map((note) => {
                const badge = getCategoryBadge(note.category);
                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {formatDateIndo(note.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(note.content, note.id)}
                          title="Salin isi catatan"
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {copiedId === note.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Hapus catatan ini?')) {
                              onDeleteNote(debt.id, note.id);
                            }
                          }}
                          title="Hapus catatan"
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
