import React, { useState, useMemo } from 'react';
import { Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { computeRunningBalances, getCashSummary } from '../utils/cashflow';
import { ConfirmModal } from './ConfirmModal';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Download,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Camera,
  BotMessageSquare,
  Eye,
  Wallet,
  Coins,
  Sparkles,
  Info,
  Clock,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  isPrivacyMode?: boolean;
  onOpenNewTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onSelectTransaction: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  isPrivacyMode = false,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onSelectTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Helper for masking amounts if privacy mode is on
  const formatMoney = (amount: number) => {
    if (isPrivacyMode) {
      return 'Rp ••••••••';
    }
    return formatRupiah(amount);
  };

  // Perhitungan Sisa Kas & Running Balance kronologis (dimulai dari Rp 0)
  const { balanceMap, latestBalance } = useMemo(() => {
    return computeRunningBalances(transactions, 0);
  }, [transactions]);

  // Ringkasan Keseluruhan Kas
  const cashSummary = useMemo(() => {
    return getCashSummary(transactions, 0);
  }, [transactions]);

  // Filtered & Sorted Transactions
  const filteredList = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchTitle = tx.title.toLowerCase().includes(q);
          const matchCategory = tx.category.toLowerCase().includes(q);
          const matchNotes = tx.notes?.toLowerCase().includes(q);
          const matchTags = tx.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCategory && !matchNotes && !matchTags) return false;
        }

        // Type
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

        // Category
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

        // Account
        if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;

        // Source
        if (sourceFilter !== 'all' && tx.source !== sourceFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, searchTerm, typeFilter, categoryFilter, accountFilter, sourceFilter, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'Judul',
      'Tipe',
      'Nominal (IDR)',
      'Sisa Kas Berjalan (IDR)',
      'Kategori',
      'Akun',
      'Sumber',
      'Catatan',
    ];
    const rows = filteredList.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
      const runningKas = balanceMap.get(tx.id) ?? 0;
      return [
        tx.id,
        tx.date,
        `"${tx.title.replace(/"/g, '""')}"`,
        tx.type,
        tx.amount,
        runningKas,
        `"${tx.category}"`,
        `"${acc}"`,
        tx.source,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arthasmart_transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distinct categories from existing list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Daftar Transaksi</h1>
            <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
              Sisa Kas Terkalkulasi
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Total {transactions.length} transaksi tercatat. Saldo awal dihitung dari Rp 0 dan sisa kas menyesuaikan transaksi masuk, keluar, dan cicilan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Sisa Kas & Cashflow Summary Bento Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Saldo Kas Awal */}
        <div className="fintech-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Saldo Awal Kas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-black">
              0
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatMoney(0)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Titik awal perhitungan kas
            </div>
          </div>
        </div>

        {/* Card 2: Total Pemasukan Kas */}
        <div className="fintech-card rounded-2xl p-4 flex flex-col justify-between border-emerald-100/90 dark:border-emerald-950/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">Total Kas Masuk (+)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
              +{formatMoney(cashSummary.totalIncome)}
            </div>
            <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
              Pemasukan & penerimaan piutang
            </div>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran Kas & Cicilan */}
        <div className="fintech-card rounded-2xl p-4 flex flex-col justify-between border-rose-100/90 dark:border-rose-950/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-widest">Total Kas Keluar (-)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-rose-950 dark:text-rose-200 font-mono">
              -{formatMoney(cashSummary.totalExpense)}
            </div>
            <div className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
              Pengeluaran & pembayaran cicilan
            </div>
          </div>
        </div>

        {/* Card 4: Sisa Kas Terkini / Terakhir */}
        <div className="rounded-2xl p-4 text-white shadow-md flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0B0F19] to-indigo-950 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">Sisa Kas Terkini</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white font-mono">
              {formatMoney(cashSummary.currentSisaKas)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5 truncate">
              <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate">
                {cashSummary.isEmpty
                  ? 'Kas awal Rp 0'
                  : `Mengikuti saldo tx terakhir`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi, merchant, tag..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            >
              <option value="all">Semua Tipe Transaksi</option>
              <option value="expense">Pengeluaran & Cicilan</option>
              <option value="income">Pemasukan & Piutang</option>
              <option value="transfer">Transfer Antar Rekening</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            >
              <option value="all">Semua Kategori</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
            >
              <option value="all">Semua Akun / Dompet</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Filters: Source & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">Sumber:</span>
            {['all', 'ai_chat', 'receipt_scan', 'manual'].map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {src === 'all'
                  ? 'Semua'
                  : src === 'ai_chat'
                  ? '💬 AI Chat'
                  : src === 'receipt_scan'
                  ? '📸 Scan Struk'
                  : '✏️ Manual'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="date_desc">Tanggal: Terbaru</option>
              <option value="date_asc">Tanggal: Terlama (Kronologis)</option>
              <option value="amount_desc">Nominal Terbesar</option>
              <option value="amount_asc">Nominal Terkecil</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        {/* Bulk Action Toolbar if items are selected */}
        {selectedTxIds.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-950/80 border-b border-indigo-100 dark:border-indigo-900/60 p-3 sm:px-6 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {selectedTxIds.length}
              </span>
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {selectedTxIds.length} transaksi dipilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTxIds([])}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                Batal Pilih
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedTxIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {filteredList.length === 0 ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada transaksi ditemukan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {transactions.length === 0
                  ? 'Belum ada transaksi tercatat. Sisa kas saat ini adalah Rp 0 (Awal).'
                  : `Transaksi kosong pada filter ini. Sisa kas Anda saat ini tetap mengikuti sisa kas transaksi terakhir:`}
              </p>
            </div>

            {/* Sisa Kas Terakhir Indicator saat kosong */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold text-slate-400">Sisa Kas Terakhir:</div>
                <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {formatRupiah(cashSummary.lastTransactionSisaKas)}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenNewTransaction}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi Baru</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredList.map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';
              const runningKas = balanceMap.get(tx.id) ?? 0;
              const isSelected = selectedTxIds.includes(tx.id);

              return (
                <div
                  key={tx.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  {/* Left info with selection checkbox */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTxIds((prev) =>
                          prev.includes(tx.id) ? prev.filter((id) => id !== tx.id) : [...prev, tx.id]
                        );
                      }}
                      className="mt-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0 transition-colors"
                      title={isSelected ? 'Batalkan pilihan' : 'Pilih transaksi'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                        isExpense
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          : isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : isIncome ? (
                        <ArrowDownRight className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{tx.title}</span>
                        {tx.receiptImage && (
                          <span
                            title="Ada foto struk terlampir"
                            className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            Struk
                          </span>
                        )}
                        {/* Sisa Kas Berjalan Badge pada Setiap Baris Transaksi */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                            runningKas >= 0
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                          title="Sisa Kas Berjalan setelah transaksi ini dieksekusi (dihitung dari saldo awal Rp 0)"
                        >
                          Sisa Kas: {formatMoney(runningKas)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span className="text-slate-800 dark:text-slate-200 font-semibold">{tx.category}</span>
                        <span>•</span>
                        <span className="text-slate-600 dark:text-slate-400">{acc?.name || 'Rekening'}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400">{tx.paymentMethod}</span>
                          </>
                        )}
                        {/* Source Tag */}
                        {tx.source === 'ai_chat' && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                            AI Chat
                          </span>
                        )}
                        {tx.source === 'receipt_scan' && (
                          <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                            Scan Struk
                          </span>
                        )}
                        {tx.source === 'manual' && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono tabular-nums ${
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
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Sisa: {formatMoney(runningKas)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTxToDelete(tx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single Transaction Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!txToDelete}
        title="Hapus Transaksi Ini?"
        message={
          txToDelete
            ? `Apakah Anda yakin ingin menghapus transaksi "${txToDelete.title}" senilai ${formatRupiah(
                txToDelete.amount
              )}? Sisa kas dan saldo akun terkait akan otomatis disesuaikan kembali.`
            : ''
        }
        confirmText="Ya, Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (txToDelete) {
            onDeleteTransaction(txToDelete.id);
            setSelectedTxIds((prev) => prev.filter((id) => id !== txToDelete.id));
            setTxToDelete(null);
          }
        }}
        onClose={() => setTxToDelete(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={`Hapus ${selectedTxIds.length} Transaksi Terpilih?`}
        message={`Apakah Anda yakin ingin menghapus ${selectedTxIds.length} transaksi yang dipilih? Seluruh data tersebut akan dihapus permanen dari Firebase Firestore dan saldo kas akan dihitung ulang secara otomatis.`}
        confirmText={`Ya, Hapus ${selectedTxIds.length} Transaksi`}
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          selectedTxIds.forEach((id) => onDeleteTransaction(id));
          setSelectedTxIds([]);
          setIsBulkDeleteModalOpen(false);
        }}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
};
