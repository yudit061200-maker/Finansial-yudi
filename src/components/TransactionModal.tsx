import React, { useState, useEffect } from 'react';
import { Transaction, Account, TransactionType } from '../types/finance';
import { DEFAULT_CATEGORIES, getTodayDateString } from '../utils/formatters';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Tag,
  Calendar,
  Wallet,
  Check,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'> | Transaction) => void;
  editTransaction?: Transaction | null;
  accounts: Account[];
  defaultType?: TransactionType;
  defaultDate?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  accounts,
  defaultType = 'expense',
  defaultDate,
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Makanan & Minuman');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id || '');
  const [date, setDate] = useState(defaultDate || getTodayDateString());
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(editTransaction.amount.toString());
      setTitle(editTransaction.title);
      setCategory(editTransaction.category);
      setAccountId(editTransaction.accountId);
      setDestinationAccountId(editTransaction.destinationAccountId || accounts[1]?.id || '');
      setDate(editTransaction.date);
      setNotes(editTransaction.notes || '');
      setTagsInput(editTransaction.tags?.join(', ') || '');
    } else {
      setType(defaultType);
      setAmount('');
      setTitle('');
      setCategory(defaultType === 'income' ? 'Gaji & Upah' : defaultType === 'transfer' ? 'Transfer Antar Akun' : 'Makanan & Minuman');
      setAccountId(accounts[0]?.id || '');
      setDestinationAccountId(accounts[1]?.id || '');
      setDate(defaultDate || getTodayDateString());
      setNotes('');
      setTagsInput('');
    }
  }, [editTransaction, isOpen, accounts, defaultType, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Harap isi judul transaksi dan nominal yang valid.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: any = {
      ...(editTransaction ? { id: editTransaction.id } : {}),
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      date,
      notes: notes.trim(),
      tags: tags.length > 0 ? tags : ['Manual'],
      source: editTransaction ? editTransaction.source : 'manual',
      isVerified: true,
    };

    onSave(payload);
    onClose();
  };

  const categoriesList =
    type === 'expense'
      ? DEFAULT_CATEGORIES.expense
      : type === 'income'
      ? DEFAULT_CATEGORIES.income
      : DEFAULT_CATEGORIES.transfer;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center">
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full my-auto shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                type === 'expense'
                  ? 'bg-rose-500'
                  : type === 'income'
                  ? 'bg-emerald-600'
                  : 'bg-indigo-600'
              }`}
            >
              {type === 'expense' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : type === 'income' ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editTransaction ? 'Edit Data Transaksi' : 'Catat Transaksi Baru'}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Mode Landscape
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {editTransaction
                  ? 'Perbarui nominal, keterangan, kategori, atau rekening dompet transaksi ini'
                  : 'Catat pengeluaran belanja harian, pemasukan, atau transfer antar rekening'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Body and Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto overscroll-contain flex-1 px-6 py-4 space-y-4 modal-scroll">
            {/* Type Switcher Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenis Transaksi
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory('Makanan & Minuman');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'expense'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Pengeluaran</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory('Gaji & Pendapatan');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Pemasukan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('transfer');
                    setCategory('Transfer Antar Rekening');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    type === 'transfer'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>

            {/* Landscape 2-Column Responsive Form Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Nominal, Judul, Kategori */}
              <div className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nominal Transaksi (IDR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-base font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Title / Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul / Keterangan Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Makan Siang Nasi Padang, Belanja Superindo"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                    required
                  />
                </div>

                {/* Category Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kategori Transaksi
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column: Account/Wallet, Date, Notes, Tags */}
              <div className="space-y-4">
                {/* Account / Wallet Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {type === 'transfer' ? 'Dari Akun (Sumber):' : 'Akun / Dompet:'}
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {type === 'transfer' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Ke Akun (Tujuan):
                      </label>
                      <select
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      >
                        {accounts
                          .filter((a) => a.id !== accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tanggal Transaksi
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                        required
                      />
                    </div>
                  )}
                </div>

                {type === 'transfer' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tanggal Transaksi
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                      required
                    />
                  </div>
                )}

                {/* Notes & Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tag (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Makan, Kantor, Liburan"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Action Buttons Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editTransaction ? 'Perbarui Transaksi' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
