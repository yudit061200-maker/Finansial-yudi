import React, { useState, useMemo } from 'react';
import {
  DebtRecord,
  DebtType,
  DebtStatus,
  Account,
  Transaction,
} from '../types/finance';
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
  Filter,
  Trash2,
  Edit2,
  MessageCircle,
  Share2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  History,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Check,
  Phone,
  HelpCircle,
} from 'lucide-react';

interface DebtReceivableProps {
  debts: DebtRecord[];
  accounts: Account[];
  onSaveDebt: (debt: DebtRecord) => Promise<void>;
  onDeleteDebt: (debtId: string) => Promise<void>;
  onAddTransaction?: (tx: Omit<Transaction, 'id'>) => Promise<void>;
}

export const DebtReceivable: React.FC<DebtReceivableProps> = ({
  debts,
  accounts,
  onSaveDebt,
  onDeleteDebt,
  onAddTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'createdAt'>('dueDate');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);

  // Payment/Installment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentDebt, setActivePaymentDebt] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState<string>(accounts[0]?.id || '');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [syncWithTransaction, setSyncWithTransaction] = useState<boolean>(true);

  // Expanded Payment History Accordions
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  // Summary Calculations
  const summary = useMemo(() => {
    const totalPayable = debts
      .filter((d) => d.type === 'payable' && d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalReceivable = debts
      .filter((d) => d.type === 'receivable' && d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalPaidPayable = debts
      .filter((d) => d.type === 'payable')
      .reduce((sum, d) => sum + d.paidAmount, 0);

    const totalPaidReceivable = debts
      .filter((d) => d.type === 'receivable')
      .reduce((sum, d) => sum + d.paidAmount, 0);

    // Overdue or upcoming within 7 days
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const urgentCount = debts.filter((d) => {
      if (d.status === 'paid' || !d.dueDate) return false;
      const due = new Date(d.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    return {
      totalPayable,
      totalReceivable,
      netBalance: totalReceivable - totalPayable,
      totalPaidPayable,
      totalPaidReceivable,
      urgentCount,
    };
  }, [debts]);

  // Filtered & Sorted Debts
  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => {
        if (activeTab !== 'all' && d.type !== activeTab) return false;
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchPerson = d.personName.toLowerCase().includes(q);
          const matchTitle = d.title.toLowerCase().includes(q);
          const matchCategory = d.category?.toLowerCase().includes(q) || false;
          const matchNotes = d.notes?.toLowerCase().includes(q) || false;
          if (!matchPerson && !matchTitle && !matchCategory && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          // Unpaid first, then nearest due date
          if (a.status !== 'paid' && b.status === 'paid') return -1;
          if (a.status === 'paid' && b.status !== 'paid') return 1;
          const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dueA - dueB;
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

  const handleOpenPaymentModal = (debt: DebtRecord) => {
    setActivePaymentDebt(debt);
    setPaymentAmount(debt.remainingAmount);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAccountId(accounts[0]?.id || '');
    setPaymentNotes(debt.type === 'payable' ? `Cicilan pelunasan hutang: ${debt.title}` : `Penerimaan pelunasan piutang: ${debt.title}`);
    setSyncWithTransaction(true);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!activePaymentDebt || paymentAmount <= 0) return;

    const newPaidAmount = activePaymentDebt.paidAmount + paymentAmount;
    const newRemainingAmount = Math.max(0, activePaymentDebt.totalAmount - newPaidAmount);
    const newStatus: DebtStatus = newRemainingAmount === 0 ? 'paid' : 'partial';

    const newPaymentEntry = {
      id: `pay-${Date.now()}`,
      date: paymentDate,
      amount: paymentAmount,
      accountId: paymentAccountId,
      notes: paymentNotes.trim() || 'Pembayaran angsuran',
    };

    const updatedDebt: DebtRecord = {
      ...activePaymentDebt,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      payments: [...(activePaymentDebt.payments || []), newPaymentEntry],
    };

    await onSaveDebt(updatedDebt);

    // Optional: create financial transaction record linked to this payment
    if (syncWithTransaction && onAddTransaction && paymentAccountId) {
      if (activePaymentDebt.type === 'payable') {
        // Bayar Hutang -> Pengeluaran Kas/Bank
        await onAddTransaction({
          date: paymentDate,
          title: `Bayar Hutang: ${activePaymentDebt.personName} (${activePaymentDebt.title})`,
          amount: paymentAmount,
          type: 'expense',
          category: 'Tagihan & Utilitas',
          subCategory: 'Pembayaran Hutang/Cicilan',
          accountId: paymentAccountId,
          notes: paymentNotes || `Pembayaran angsuran hutang kepada ${activePaymentDebt.personName}`,
          source: 'manual',
        });
      } else {
        // Terima Pelunasan Piutang -> Pemasukan Kas/Bank
        await onAddTransaction({
          date: paymentDate,
          title: `Pelunasan Piutang: ${activePaymentDebt.personName} (${activePaymentDebt.title})`,
          amount: paymentAmount,
          type: 'income',
          category: 'Pendapatan Lain',
          subCategory: 'Pelunasan Piutang',
          accountId: paymentAccountId,
          notes: paymentNotes || `Penerimaan uang piutang dari ${activePaymentDebt.personName}`,
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

    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(debt.remainingAmount);

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
    }).format(val);
  };

  const getDueStatusBadge = (debt: DebtRecord) => {
    if (debt.status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Lunas
        </span>
      );
    }

    if (!debt.dueDate) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          Tanpa Jatuh Tempo
        </span>
      );
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(debt.dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Lewat {Math.abs(diffDays)} Hari
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Jatuh Tempo Hari Ini
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {diffDays} Hari Lagi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        <Calendar className="w-3 h-3 text-slate-400" />
        {diffDays} Hari Lagi
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Hutang (Kewajiban) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hutang Saya (Kewajiban)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {formatCurrency(summary.totalPayable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Sudah dicicil: {formatCurrency(summary.totalPaidPayable)}</span>
            <span className="font-semibold text-rose-600">Harus Dibayar</span>
          </div>
        </div>

        {/* Card 2: Total Piutang (Hak Tagih) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Piutang Saya (Uang Dipinjamkan)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {formatCurrency(summary.totalReceivable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Sudah diterima: {formatCurrency(summary.totalPaidReceivable)}</span>
            <span className="font-semibold text-emerald-600">Akan Diterima</span>
          </div>
        </div>

        {/* Card 3: Posisi Bersih & Urgensi */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              Posisi Arus Kas Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.netBalance >= 0 ? `+${formatCurrency(summary.netBalance)}` : formatCurrency(summary.netBalance)}
            </div>
            <div className="text-[11px] text-indigo-200/80 mt-0.5">
              {summary.netBalance >= 0 ? 'Piutang lebih besar dari hutang' : 'Kewajiban hutang lebih besar'}
            </div>
          </div>
          {summary.urgentCount > 0 && (
            <div className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-1 rounded-lg flex items-center gap-1.5 w-fit">
              <AlertCircle className="w-3 h-3" />
              <span>{summary.urgentCount} pinjaman mendekati jatuh tempo</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Filters, Search, and Add Button */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Left Side: Tab Type Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({debts.length})
          </button>
          <button
            onClick={() => setActiveTab('payable')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'payable' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Hutang ({debts.filter((d) => d.type === 'payable').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('receivable')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'receivable' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Piutang ({debts.filter((d) => d.type === 'receivable').length})</span>
          </button>
        </div>

        {/* Middle: Search & Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama orang, keperluan, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="partial">Sebagian (Cicil)</option>
            <option value="paid">Sudah Lunas</option>
          </select>
        </div>

        {/* Right Side: Add Button */}
        <button
          onClick={() => {
            setEditingDebt(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Hutang / Piutang</span>
        </button>
      </div>

      {/* Debts List */}
      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum Ada Catatan Hutang / Piutang</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Mulai catat pinjaman kepada teman, cicilan bank, atau tagihan piutang Anda agar keuangan tetap rapi dan terkontrol.
          </p>
          <button
            onClick={() => {
              setEditingDebt(null);
              setIsModalOpen(true);
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            + Buat Catatan Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((debt) => {
            const isPayable = debt.type === 'payable';
            const progressPercent =
              debt.totalAmount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) : 0;
            const isHistoryExpanded = expandedHistories[debt.id];

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-3xl bg-white border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                  debt.status === 'paid'
                    ? 'border-slate-200 bg-slate-50/50 opacity-90'
                    : isPayable
                    ? 'border-rose-100 hover:border-rose-300'
                    : 'border-emerald-100 hover:border-emerald-300'
                }`}
              >
                {/* Top Row: Type & Person */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isPayable
                            ? 'bg-rose-50 border-rose-200/60 text-rose-600'
                            : 'bg-emerald-50 border-emerald-200/60 text-emerald-600'
                        }`}
                      >
                        {isPayable ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isPayable ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isPayable ? 'Hutang Saya' : 'Piutang Saya'}
                          </span>
                          {debt.category && (
                            <span className="text-[11px] text-slate-500 font-medium">{debt.category}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 tracking-tight">
                          {debt.personName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">{getDueStatusBadge(debt)}</div>
                  </div>

                  {/* Purpose / Title */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-800">{debt.title}</div>
                    {debt.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 italic">"{debt.notes}"</p>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Sisa Kewajiban:</span>
                      <span
                        className={`font-black text-sm ${
                          debt.status === 'paid'
                            ? 'text-slate-400 line-through'
                            : isPayable
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Total: {formatCurrency(debt.totalAmount)}</span>
                      <span>Sudah bayar: {formatCurrency(debt.paidAmount)} ({progressPercent}%)</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          debt.status === 'paid'
                            ? 'bg-emerald-500'
                            : isPayable
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Due Date & Contacts info */}
                  <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Jatuh Tempo:{' '}
                        {debt.dueDate
                          ? new Date(debt.dueDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Fleksibel'}
                      </span>
                    </div>

                    {debt.contactPhone && (
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{debt.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Pay / Receive Installment Button */}
                    {debt.status !== 'paid' ? (
                      <button
                        onClick={() => handleOpenPaymentModal(debt)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          isPayable
                            ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{isPayable ? 'Bayar / Cicil Hutang' : 'Terima Pembayaran'}</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pinjaman Telah Lunas</span>
                      </div>
                    )}

                    {/* WhatsApp Reminder Button (for Receivable) */}
                    {!isPayable && debt.status !== 'paid' && debt.contactPhone && (
                      <button
                        onClick={() => handleOpenWhatsAppReminder(debt)}
                        title="Kirim Pengingat WhatsApp"
                        className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">Kirim WA</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setEditingDebt(debt);
                        setIsModalOpen(true);
                      }}
                      title="Edit Data Pinjaman"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Hapus catatan ${isPayable ? 'hutang' : 'piutang'} "${debt.title}"?`)) {
                          onDeleteDebt(debt.id);
                        }
                      }}
                      title="Hapus Catatan"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Payment History Accordion */}
                  {debt.payments && debt.payments.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleHistory(debt.id)}
                        className="w-full text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Riwayat Pembayaran ({debt.payments.length} kali)</span>
                        </div>
                        {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isHistoryExpanded && (
                        <div className="mt-2 space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                          {debt.payments.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{formatCurrency(p.amount)}</span>
                                <span className="text-slate-400 mx-1.5">•</span>
                                <span className="text-slate-500">{p.date}</span>
                                {p.notes && <span className="text-slate-400 block text-[10px] italic">{p.notes}</span>}
                              </div>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                Sukses
                              </span>
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

      {/* Modal 1: Tambah / Edit Hutang & Piutang */}
      {isModalOpen && (
        <DebtFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingDebt(null);
          }}
          onSave={async (savedDebt) => {
            await onSaveDebt(savedDebt);
            setIsModalOpen(false);
            setEditingDebt(null);
          }}
          editingDebt={editingDebt}
          accounts={accounts}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* Modal 2: Catat Pembayaran / Cicilan */}
      {isPaymentModalOpen && activePaymentDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activePaymentDebt.type === 'payable' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activePaymentDebt.type === 'payable' ? 'Bayar Angsuran Hutang' : 'Terima Pembayaran Piutang'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Kepada / Dari: {activePaymentDebt.personName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Pinjaman:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(activePaymentDebt.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Sisa Belum Dibayar:</span>
                <span className="font-bold text-rose-600">{formatCurrency(activePaymentDebt.remainingAmount)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900"
                    placeholder="Contoh: 500000"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(activePaymentDebt.remainingAmount)}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Lunaskan Semua ({formatCurrency(activePaymentDebt.remainingAmount)})
                  </button>
                  {activePaymentDebt.remainingAmount > 1000000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.round(activePaymentDebt.remainingAmount / 2))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      50% ({formatCurrency(Math.round(activePaymentDebt.remainingAmount / 2))})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {activePaymentDebt.type === 'payable' ? 'Rekening Sumber Dana' : 'Rekening Penampung'}
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contoh: Transfer via Livin Mandiri / Tunai"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div className="text-[11px]">
                  <span className="font-bold text-indigo-950 block">Otomatis Sinkron ke Catatan Transaksi</span>
                  <span className="text-indigo-700">
                    {activePaymentDebt.type === 'payable'
                      ? 'Catat sebagai transaksi pengeluaran & potong saldo rekening'
                      : 'Catat sebagai transaksi pemasukan & tambah saldo rekening'}
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

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={paymentAmount <= 0}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: DebtRecord) => Promise<void>;
  editingDebt: DebtRecord | null;
  accounts: Account[];
  onAddTransaction?: (tx: Omit<Transaction, 'id'>) => Promise<void>;
}

const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDebt,
  accounts,
  onAddTransaction,
}) => {
  const [type, setType] = useState<DebtType>(editingDebt?.type || 'payable');
  const [personName, setPersonName] = useState(editingDebt?.personName || '');
  const [contactPhone, setContactPhone] = useState(editingDebt?.contactPhone || '');
  const [title, setTitle] = useState(editingDebt?.title || '');
  const [totalAmount, setTotalAmount] = useState<number>(editingDebt?.totalAmount || 0);
  const [paidAmount, setPaidAmount] = useState<number>(editingDebt?.paidAmount || 0);
  const [startDate, setStartDate] = useState(editingDebt?.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(editingDebt?.dueDate || '');
  const [category, setCategory] = useState(editingDebt?.category || (type === 'payable' ? 'Cicilan Bank' : 'Pinjaman Teman'));
  const [notes, setNotes] = useState(editingDebt?.notes || '');
  const [recordInitialTransaction, setRecordInitialTransaction] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !title.trim() || totalAmount <= 0) {
      alert('Harap lengkapi nama pihak, keperluan, dan nominal pinjaman.');
      return;
    }

    const calculatedRemaining = Math.max(0, totalAmount - paidAmount);
    const calculatedStatus: DebtStatus = calculatedRemaining === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    const debtData: DebtRecord = {
      id: editingDebt?.id || `debt-${Date.now()}`,
      type,
      personName: personName.trim(),
      contactPhone: contactPhone.trim() || undefined,
      title: title.trim(),
      totalAmount,
      paidAmount,
      remainingAmount: calculatedRemaining,
      startDate,
      dueDate: dueDate || undefined,
      status: calculatedStatus,
      category,
      notes: notes.trim() || undefined,
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
          title: `Pencairan Pinjaman: ${personName} (${title})`,
          amount: totalAmount,
          type: 'income',
          category: 'Pendapatan Lain',
          subCategory: 'Pencairan Pinjaman/Hutang',
          accountId: selectedAccountId,
          notes: `Dana pinjaman dari ${personName}`,
          source: 'manual',
        });
      } else {
        // Saya meminjamkan uang ke orang -> Saldo rekening saya keluar (Expense / Talangan)
        await onAddTransaction({
          date: startDate,
          title: `Pemberian Pinjaman/Talangan: ${personName} (${title})`,
          amount: totalAmount,
          type: 'expense',
          category: 'Pengeluaran Lain',
          subCategory: 'Pemberian Pinjaman/Piutang',
          accountId: selectedAccountId,
          notes: `Meminjamkan uang kepada ${personName}`,
          source: 'manual',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                type === 'payable' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingDebt ? 'Edit Data Pinjaman' : 'Catat Hutang / Piutang Baru'}
              </h3>
              <p className="text-xs text-slate-500">Kelola kewajiban dan tagihan keuangan Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Selector (Payable vs Receivable) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Jenis Catatan Pinjaman</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('payable');
                  if (!editingDebt) setCategory('Cicilan Bank');
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  type === 'payable'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Hutang Saya</div>
                  <div className="text-[10px] text-slate-500">Kewajiban harus saya bayar</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('receivable');
                  if (!editingDebt) setCategory('Pinjaman Teman');
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  type === 'receivable'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Piutang Saya</div>
                  <div className="text-[10px] text-slate-500">Orang berhutang ke saya</div>
                </div>
              </button>
            </div>
          </div>

          {/* Person Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {type === 'payable' ? 'Nama Pemberi Pinjaman / Bank' : 'Nama Peminjam'} *
              </label>
              <input
                type="text"
                required
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder={type === 'payable' ? 'Contoh: Bank BCA / Kredivo / Budi' : 'Contoh: Budi Santoso / Rian'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">No WhatsApp / HP (Opsional)</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Keperluan / Judul *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pinjaman modal laptop / Talangan tiket"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              >
                {type === 'payable' ? (
                  <>
                    <option value="Cicilan Bank">Cicilan Bank / KTA</option>
                    <option value="PayLater">PayLater (Shopee/Kredivo/GoPay)</option>
                    <option value="Kartu Kredit">Kartu Kredit</option>
                    <option value="Pinjaman Teman">Pinjaman Teman / Keluarga</option>
                    <option value="Pinjaman Usaha">Pinjaman Usaha</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="Pinjaman Teman">Pinjaman Teman</option>
                    <option value="Pinjaman Keluarga">Pinjaman Keluarga</option>
                    <option value="Talangan Belanja">Talangan Belanja / Konser</option>
                    <option value="Piutang Usaha / Klien">Piutang Usaha / Klien</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Nominal Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Nominal Pinjaman (Rp) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  value={totalAmount || ''}
                  onChange={(e) => setTotalAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="1000000"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sudah Dibayar (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Math.min(totalAmount, Math.max(0, Number(e.target.value))))}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai Pinjam</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Jatuh Tempo (Opsional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Tenor 6 bulan, bunga 0%, transfer via BCA"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
            />
          </div>

          {/* New Loan Initial Transaction Sync Option */}
          {!editingDebt && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    {type === 'payable'
                      ? 'Catat Penerimaan Dana ke Rekening Sekarang'
                      : 'Potong Saldo Rekening untuk Pinjaman Ini'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {type === 'payable'
                      ? 'Saldo rekening akan bertambah sejumlah pinjaman'
                      : 'Saldo rekening akan berkurang sejumlah pinjaman yang diberikan'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={recordInitialTransaction}
                  onChange={(e) => setRecordInitialTransaction(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {recordInitialTransaction && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block font-bold text-slate-700 mb-1">Pilih Rekening Terkait</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer active:scale-98"
            >
              {editingDebt ? 'Simpan Perubahan' : 'Simpan ke Cloud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
