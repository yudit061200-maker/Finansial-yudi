import React, { useState, useMemo } from 'react';
import { Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateIndo, DEFAULT_CATEGORIES } from '../utils/formatters';
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
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  onOpenNewTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onSelectTransaction: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
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
    const headers = ['ID', 'Tanggal', 'Judul', 'Tipe', 'Nominal (IDR)', 'Kategori', 'Akun', 'Sumber', 'Catatan'];
    const rows = filteredList.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
      return [
        tx.id,
        tx.date,
        `"${tx.title.replace(/"/g, '""')}"`,
        tx.type,
        tx.amount,
        `"${tx.category}"`,
        `"${acc}"`,
        tx.source,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daftar Transaksi</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Total {transactions.length} transaksi tercatat melalui AI Chat, Scan Struk, dan Input Manual.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi, merchant, tag..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            >
              <option value="all">Semua Tipe Transaksi</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer Antar Rekening</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 font-bold shrink-0">Sumber:</span>
            {['all', 'ai_chat', 'receipt_scan', 'manual'].map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
            <span className="text-slate-500 font-medium">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="date_desc">Terbaru</option>
              <option value="date_asc">Terlama</option>
              <option value="amount_desc">Nominal Terbesar</option>
              <option value="amount_asc">Nominal Terkecil</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {filteredList.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-bold text-slate-800">Tidak ada transaksi yang cocok</p>
            <p className="text-[11px] text-slate-500">Coba ubah kata kunci pencarian atau filter yang dipilih.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-indigo-50 text-indigo-600'
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{tx.title}</span>
                        {tx.receiptImage && (
                          <span
                            title="Ada foto struk terlampir"
                            className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            Struk
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                        <span>{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span className="text-slate-800 font-semibold">{tx.category}</span>
                        <span>•</span>
                        <span className="text-slate-600">{acc?.name || 'Rekening'}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{tx.paymentMethod}</span>
                          </>
                        )}
                        {/* Source Tag */}
                        {tx.source === 'ai_chat' && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                            AI Chat
                          </span>
                        )}
                        {tx.source === 'receipt_scan' && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                            Scan Struk
                          </span>
                        )}
                        {tx.source === 'manual' && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div
                      className={`text-sm font-bold ${
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Lihat Detail Transaksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus transaksi "${tx.title}"?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
    </div>
  );
};
