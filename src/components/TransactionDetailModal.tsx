import React, { useState } from 'react';
import { Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateFull } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Receipt,
  Tag,
  Wallet,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  BotMessageSquare,
  Camera,
} from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  accounts: Account[];
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  accounts,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  if (!transaction) return null;

  const acc = accounts.find((a) => a.id === transaction.accountId);
  const destAcc = transaction.destinationAccountId
    ? accounts.find((a) => a.id === transaction.destinationAccountId)
    : null;

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isExpense
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900'
                    : isIncome
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900'
                }`}
              >
                {transaction.type.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">ID: {transaction.id}</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hero Amount & Title */}
          <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <div
              className={`text-2xl font-black tracking-tight ${
                isExpense
                  ? 'text-rose-600 dark:text-rose-400'
                  : isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {isExpense ? '-' : isIncome ? '+' : ''}
              {formatRupiah(transaction.amount)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 px-4 truncate">
              {transaction.title}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {formatDateFull(transaction.date)}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Kategori</div>
              <div className="font-bold text-slate-900 dark:text-white">{transaction.category}</div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Akun / Rekening</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">{acc?.name || 'Rekening'}</div>
            </div>

            {destAcc && (
              <div className="col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Akun Tujuan</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">{destAcc.name}</div>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Sumber Input</div>
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {transaction.source === 'ai_chat' && <BotMessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                {transaction.source === 'receipt_scan' && <Camera className="w-3.5 h-3.5 text-blue-600" />}
                <span>
                  {transaction.source === 'ai_chat'
                    ? 'AI Chat Input'
                    : transaction.source === 'receipt_scan'
                    ? 'Scan Foto Struk OCR'
                    : 'Input Manual'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Metode Bayar</div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {transaction.paymentMethod || 'Debit / Tunai'}
              </div>
            </div>
          </div>

          {/* Notes & Tags */}
          {transaction.notes && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Catatan</div>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {transaction.notes}
              </div>
            </div>
          )}

          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mr-1">Tags:</span>
              {transaction.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Itemized Line Items if from Receipt */}
          {transaction.receiptItems && transaction.receiptItems.length > 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Daftar Item Belanjaan Terlampir ({transaction.receiptItems.length})
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-40 overflow-y-auto pr-1">
                {transaction.receiptItems.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{item.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">({item.quantity}x)</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Struk Preview */}
          {transaction.receiptImage && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Foto / Bukti Struk
              </div>
              <div className="h-44 w-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 p-2">
                <img
                  src={transaction.receiptImage}
                  alt="Receipt"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Transaksi</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEdit(transaction);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Transaction Detail */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Hapus Transaksi Ini?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${transaction.title}" senilai ${formatRupiah(
          transaction.amount
        )}? Sisa kas dan saldo rekening akan disesuaikan kembali secara otomatis.`}
        confirmText="Ya, Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          onDelete(transaction.id);
          setIsConfirmDeleteOpen(false);
          onClose();
        }}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </>
  );
};
