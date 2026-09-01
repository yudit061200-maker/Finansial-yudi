import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Smartphone,
  Banknote,
  TrendingUp,
  CreditCard,
  Wallet,
  Coins,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Account, AccountType, BankProvider } from '../types/finance';
import { formatRupiah } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Account) => void;
  onDelete?: (accountId: string, deleteLinkedTransactions?: boolean) => void;
  onResetBalance?: (accountId: string) => void;
  onClearTransactions?: (accountId: string) => void;
  editAccount?: Account | null;
  accountsCount: number;
}

const PROVIDER_PRESETS: Array<{
  provider: BankProvider;
  name: string;
  type: AccountType;
  color: string;
  icon: string;
}> = [
  { provider: 'bca', name: 'BCA (Bank Central Asia)', type: 'bank', color: '#00529B', icon: 'Building2' },
  { provider: 'mandiri', name: 'Bank Mandiri', type: 'bank', color: '#003366', icon: 'Building2' },
  { provider: 'bri', name: 'Bank BRI', type: 'bank', color: '#0066AE', icon: 'Building2' },
  { provider: 'bni', name: 'Bank BNI', type: 'bank', color: '#005E6A', icon: 'Building2' },
  { provider: 'cimb', name: 'CIMB Niaga', type: 'bank', color: '#ED1B24', icon: 'Building2' },
  { provider: 'jenius', name: 'Jenius (BTPN)', type: 'bank', color: '#00A4E4', icon: 'Smartphone' },
  { provider: 'gopay', name: 'GoPay', type: 'ewallet', color: '#00AA13', icon: 'Smartphone' },
  { provider: 'ovo', name: 'OVO', type: 'ewallet', color: '#4C2A86', icon: 'Smartphone' },
  { provider: 'dana', name: 'DANA', type: 'ewallet', color: '#118EEA', icon: 'Smartphone' },
  { provider: 'shopeepay', name: 'ShopeePay', type: 'ewallet', color: '#EE4D2D', icon: 'Smartphone' },
  { provider: 'bibit', name: 'Bibit Reksadana / Saham', type: 'investment', color: '#10B981', icon: 'TrendingUp' },
  { provider: 'cash', name: 'Uang Tunai / Cash', type: 'cash', color: '#F59E0B', icon: 'Banknote' },
  { provider: 'other', name: 'Lainnya / Bank Lain', type: 'bank', color: '#6366F1', icon: 'Building2' },
];

const COLOR_PRESETS = [
  '#4F46E5', // Indigo
  '#00529B', // BCA Blue
  '#003366', // Mandiri Dark Blue
  '#0066AE', // BRI Blue
  '#005E6A', // BNI Teal
  '#00AA13', // GoPay Green
  '#4C2A86', // OVO Purple
  '#118EEA', // DANA Blue
  '#EE4D2D', // Shopee Orange
  '#10B981', // Emerald
  '#059669', // Dark Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#0EA5E9', // Sky Blue
  '#475569', // Slate
];

const ICONS = [
  { id: 'Building2', label: 'Bank', icon: Building2 },
  { id: 'Smartphone', label: 'E-Wallet', icon: Smartphone },
  { id: 'Banknote', label: 'Tunai', icon: Banknote },
  { id: 'TrendingUp', label: 'Investasi', icon: TrendingUp },
  { id: 'CreditCard', label: 'Kartu Kredit', icon: CreditCard },
  { id: 'Wallet', label: 'Dompet', icon: Wallet },
  { id: 'Coins', label: 'Koin / Kripto', icon: Coins },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onResetBalance,
  onClearTransactions,
  editAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [provider, setProvider] = useState<BankProvider>('bca');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [balance, setBalance] = useState('0');
  const [color, setColor] = useState('#4F46E5');
  const [icon, setIcon] = useState('Building2');

  // Deletion options
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTransactionsAlso, setDeleteTransactionsAlso] = useState(false);
  const [isResetBalanceModalOpen, setIsResetBalanceModalOpen] = useState(false);
  const [isClearTxModalOpen, setIsClearTxModalOpen] = useState(false);

  useEffect(() => {
    if (editAccount) {
      setName(editAccount.name);
      setType(editAccount.type);
      setProvider(editAccount.provider);
      setAccountNumber(editAccount.accountNumberMasked.replace(/•/g, '*'));
      setAccountHolder(editAccount.accountHolder || '');
      setBalance(editAccount.balance !== undefined ? editAccount.balance.toString() : '0');
      setColor(editAccount.color);
      setIcon(editAccount.icon);
      setShowDeleteConfirm(false);
      setDeleteTransactionsAlso(false);
    } else {
      // Default new account
      setName('');
      setType('bank');
      setProvider('bca');
      setAccountNumber('');
      setAccountHolder('');
      setBalance('0');
      setColor('#00529B');
      setIcon('Building2');
      setShowDeleteConfirm(false);
      setDeleteTransactionsAlso(false);
    }
  }, [editAccount, isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: BankProvider) => {
    setProvider(newProvider);
    const preset = PROVIDER_PRESETS.find((p) => p.provider === newProvider);
    if (preset) {
      if (!name || PROVIDER_PRESETS.some((p) => p.name === name || name.includes('BCA') || name.includes('Mandiri'))) {
        setName(preset.name.split(' (')[0]);
      }
      setType(preset.type);
      setColor(preset.color);
      setIcon(preset.icon);
    }
  };

  const handleQuickBalanceSet = (val: number) => {
    setBalance(val.toString());
  };

  const handleQuickBalanceAdd = (amount: number) => {
    const current = parseFloat(balance) || 0;
    setBalance((current + amount).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    // Mask account number for safe display
    let maskedNumber = accountNumber.trim();
    if (maskedNumber.length > 4) {
      const visibleStart = maskedNumber.slice(0, 4);
      const visibleEnd = maskedNumber.slice(-2);
      maskedNumber = `${visibleStart}••••${visibleEnd}`;
    } else if (!maskedNumber) {
      maskedNumber = type === 'cash' ? 'Tunai Fisik' : 'Aktif';
    }

    const parsedBalance = parseFloat(balance);
    const validBalance = isNaN(parsedBalance) ? 0 : parsedBalance;

    const newAccount: Account = {
      id: editAccount ? editAccount.id : `acc-${Date.now()}`,
      name: name.trim(),
      type,
      provider,
      accountNumberMasked: maskedNumber,
      balance: validBalance,
      currency: 'IDR',
      color,
      icon,
      accountHolder: accountHolder.trim() || undefined,
    };

    onSave(newAccount);
    onClose();
  };

  const handleDirectResetBalance = () => {
    if (!editAccount) {
      setBalance('0');
      return;
    }
    setIsResetBalanceModalOpen(true);
  };

  const handleExecuteResetBalance = () => {
    if (!editAccount) return;
    setBalance('0');
    if (onResetBalance) {
      onResetBalance(editAccount.id);
      setIsResetBalanceModalOpen(false);
      onClose();
    }
  };

  const handleExecuteClearTransactions = () => {
    if (!editAccount) return;
    if (onClearTransactions) {
      onClearTransactions(editAccount.id);
      setIsClearTxModalOpen(false);
      onClose();
    }
  };

  const handleDirectDelete = () => {
    if (!editAccount || !onDelete) return;
    onDelete(editAccount.id, deleteTransactionsAlso);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-xs"
              style={{ backgroundColor: color }}
            >
              {name ? name.slice(0, 2).toUpperCase() : 'AK'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editAccount ? 'Kelola & Edit Akun Rekening' : 'Tambah Akun Rekening Baru'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {editAccount ? 'Ubah saldo, reset ke Rp 0, atau perbarui data akun' : 'Tambahkan rekening bank, e-wallet, atau dompet tunai'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider / Template Quick Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilihan Bank / Dompet / Platform
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as BankProvider)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Akun / Rekening
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA Tahapan Utama, GoPay Harian, Dompet Tunai"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              required
            />
          </div>

          {/* Account Type Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jenis Akun
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-center">
              {[
                { id: 'bank', label: 'Bank' },
                { id: 'ewallet', label: 'E-Wallet' },
                { id: 'cash', label: 'Tunai' },
                { id: 'investment', label: 'Investasi' },
                { id: 'credit_card', label: 'Kredit' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as AccountType)}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    type === t.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Balance (Saldo) Management Section */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                {editAccount ? 'Saldo Terkini Akun (IDR)' : 'Saldo Awal (IDR)'}
              </label>
              <button
                type="button"
                onClick={() => setBalance('0')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Set Saldo menjadi 0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ke Rp 0</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Balance Presets & Zero Out Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickBalanceSet(0)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  parseFloat(balance) === 0
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                Rp 0 (Kosong)
              </button>
              <button
                type="button"
                onClick={() => handleQuickBalanceAdd(100000)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
              >
                +100rb
              </button>
              <button
                type="button"
                onClick={() => handleQuickBalanceAdd(500000)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
              >
                +500rb
              </button>
              <button
                type="button"
                onClick={() => handleQuickBalanceAdd(1000000)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
              >
                +1 Juta
              </button>
              <button
                type="button"
                onClick={() => handleQuickBalanceAdd(5000000)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
              >
                +5 Juta
              </button>
            </div>
          </div>

          {/* Number & Holder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor Rekening / HP (Opsional)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Contoh: 5271948821"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Atas Nama / Pemilik (Opsional)
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Contoh: Yudit Hermawan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Color Picker Swatches */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Warna Aksen Akun
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                    color === c
                      ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                title="Pilih warna kustom"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ikon Akun
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danger / Account Management Zone when Editing */}
          {editAccount && (
            <div className="border-t border-slate-200 pt-3.5 space-y-2.5">
              <div className="text-xs font-bold text-slate-700">Opsi Pengelolaan & Hapus</div>

              {!showDeleteConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  {onResetBalance && (
                    <button
                      type="button"
                      onClick={handleDirectResetBalance}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kosongkan Saldo (Rp 0)</span>
                    </button>
                  )}

                  {onClearTransactions && (
                    <button
                      type="button"
                      onClick={() => setIsClearTxModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bersihkan Transaksi Akun</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Akun Ini</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2 text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Konfirmasi Hapus Akun "{editAccount.name}"</div>
                      <div className="text-rose-700 text-[11px] mt-0.5">
                        Saldo saat ini ({formatRupiah(editAccount.balance)}) dan akun akan dihapus dari sistem.
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-rose-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteTransactionsAlso}
                      onChange={(e) => setDeleteTransactionsAlso(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Hapus juga seluruh riwayat transaksi akun ini</span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectDelete}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Permanen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editAccount ? 'Simpan Perubahan' : 'Tambah Akun'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Reset Balance Confirm Modal */}
      <ConfirmModal
        isOpen={isResetBalanceModalOpen}
        title="Kosongkan Saldo Akun?"
        message={
          editAccount
            ? `Apakah Anda yakin ingin mereset saldo akun "${editAccount.name}" menjadi Rp 0?`
            : ''
        }
        confirmText="Ya, Reset Saldo"
        cancelText="Batal"
        variant="warning"
        icon="alert"
        onConfirm={handleExecuteResetBalance}
        onClose={() => setIsResetBalanceModalOpen(false)}
      />

      {/* Clear Account Transactions Confirm Modal */}
      <ConfirmModal
        isOpen={isClearTxModalOpen}
        title="Bersihkan Transaksi Akun?"
        message={
          editAccount
            ? `Apakah Anda yakin ingin menghapus semua riwayat transaksi yang terkait dengan rekening "${editAccount.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmText="Ya, Bersihkan Transaksi"
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={handleExecuteClearTransactions}
        onClose={() => setIsClearTxModalOpen(false)}
      />
    </div>
  );
};
