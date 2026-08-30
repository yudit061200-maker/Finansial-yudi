import React, { useState, useMemo } from 'react';
import { DebtRecord, Account, Transaction } from '../types/finance';
import { formatRupiah, formatDateIndo, getNearestDueInfo, isDebtPaid } from '../utils/formatters';
import {
  Calculator,
  ShoppingBag,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  DollarSign,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Building2,
  Clock,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';

interface MonthlyCreditCalculatorProps {
  debts: DebtRecord[];
  accounts: Account[];
  transactions: Transaction[];
  onOpenPaymentModal: (debt: DebtRecord, monthNum?: number) => void;
  onOpenAddInstallment: () => void;
}

export const MonthlyCreditCalculator: React.FC<MonthlyCreditCalculatorProps> = ({
  debts,
  accounts,
  transactions,
  onOpenPaymentModal,
  onOpenAddInstallment,
}) => {
  // Estimated monthly income for DSR (Debt Service Ratio) calculation
  const defaultIncome = useMemo(() => {
    // Calculate average monthly income from transactions of the last 3 months if available
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthIncome = transactions
      .filter((t) => {
        if (t.type !== 'income') return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return thisMonthIncome > 0 ? thisMonthIncome : 8000000; // Default 8jt if empty
  }, [transactions]);

  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState<string>(defaultIncome.toString());
  const [extraPaymentInput, setExtraPaymentInput] = useState<string>('500000');
  const [selectedStrategy, setSelectedStrategy] = useState<'avalanche' | 'snowball'>('snowball');

  const monthlyIncome = parseFloat(monthlyIncomeInput) || 0;
  const extraPayment = parseFloat(extraPaymentInput) || 0;

  // Active Installments & Active Payables
  const activeInstallments = useMemo(() => {
    return debts.filter(
      (d) => (d.type === 'installment' || d.isInstallment) && !isDebtPaid(d)
    );
  }, [debts]);

  const activePayables = useMemo(() => {
    return debts.filter((d) => d.type === 'payable' && !isDebtPaid(d));
  }, [debts]);

  // Monthly breakdown calculation
  const monthlySummary = useMemo(() => {
    // 1. Total monthly installment obligation
    const totalInstallmentMonthly = activeInstallments.reduce((sum, d) => {
      if (d.monthlyInstallment && d.monthlyInstallment > 0) {
        return sum + d.monthlyInstallment;
      }
      // If no monthly installment explicit, estimate by remaining tenor or 1 month
      const tenor = (d.tenorMonths || 12) - (d.paidMonths || 0);
      const remainingTenor = Math.max(1, tenor);
      return sum + Math.round(d.remainingAmount / remainingTenor);
    }, 0);

    // 2. Payables due this month (if any)
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const payablesDueThisMonth = activePayables
      .filter((d) => {
        if (!d.dueDate) return false;
        const due = new Date(d.dueDate);
        return due.getMonth() === curMonth && due.getFullYear() === curYear;
      })
      .reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalMonthlyObligation = totalInstallmentMonthly + payablesDueThisMonth;

    // Total remaining principal across all active items
    const totalRemainingDebt =
      activeInstallments.reduce((sum, d) => sum + d.remainingAmount, 0) +
      activePayables.reduce((sum, d) => sum + d.remainingAmount, 0);

    // DSR (Debt Service Ratio)
    const dsrPercent = monthlyIncome > 0 ? (totalMonthlyObligation / monthlyIncome) * 100 : 0;

    let dsrStatus: 'healthy' | 'caution' | 'danger' = 'healthy';
    let dsrMessage = 'Beban cicilan sangat ideal dan aman (< 30% pendapatan).';
    let dsrColor = 'text-emerald-600 dark:text-emerald-400';
    let dsrBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';

    if (dsrPercent > 40) {
      dsrStatus = 'danger';
      dsrMessage = 'Peringatan: Beban cicilan melebihi 40% pendapatan. Berisiko mengganggu arus kas harian.';
      dsrColor = 'text-rose-600 dark:text-rose-400';
      dsrBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    } else if (dsrPercent >= 30) {
      dsrStatus = 'caution';
      dsrMessage = 'Waspada: Beban cicilan berada di batas maksimal (30% - 40%). Batasi pengambilan kredit baru.';
      dsrColor = 'text-amber-600 dark:text-amber-400';
      dsrBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    }

    return {
      totalInstallmentMonthly,
      payablesDueThisMonth,
      totalMonthlyObligation,
      totalRemainingDebt,
      dsrPercent: Math.round(dsrPercent * 10) / 10,
      dsrStatus,
      dsrMessage,
      dsrColor,
      dsrBg,
      activeCount: activeInstallments.length + activePayables.length,
    };
  }, [activeInstallments, activePayables, monthlyIncome]);

  // 12-Month Projection Schedule
  const projectionSchedule = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = targetDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      const fullMonthName = targetDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      let monthTotal = 0;
      const endingCredits: string[] = [];

      activeInstallments.forEach((inst) => {
        const remainingMonths = Math.max(0, (inst.tenorMonths || 12) - (inst.paidMonths || 0));
        if (i < remainingMonths) {
          const installmentAmount = inst.monthlyInstallment || Math.round(inst.remainingAmount / remainingMonths);
          monthTotal += installmentAmount;

          if (i === remainingMonths - 1) {
            endingCredits.push(inst.itemName || inst.title);
          }
        }
      });

      months.push({
        index: i,
        monthLabel,
        fullMonthName,
        monthTotal,
        endingCredits,
      });
    }

    return months;
  }, [activeInstallments]);

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Penghitungan Kredit & Cicilan Tiap Bulan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Analisis total kewajiban bulanan, rasio beban cicilan (DSR), dan jadwal proyeksi pelunasan.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAddInstallment}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>+ Tambah Kredit / Cicilan</span>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Cicilan Wajib Tiap Bulan */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-md relative overflow-hidden border border-indigo-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Total Cicilan Tiap Bulan
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight mt-2.5">
            {formatRupiah(monthlySummary.totalMonthlyObligation)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-indigo-200/80 mt-2">
            <span>{activeInstallments.length} Kontrak Cicilan Aktif</span>
            <span className="font-semibold text-emerald-300">Wajib Rutin</span>
          </div>
        </div>

        {/* Card 2: Rasio Beban Cicilan (DSR) */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-colors ${monthlySummary.dsrBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Rasio Beban Cicilan (DSR)
            </span>
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs">
              {monthlySummary.dsrStatus === 'healthy' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : monthlySummary.dsrStatus === 'caution' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2.5">
            <span className={`text-2xl font-black ${monthlySummary.dsrColor}`}>
              {monthlySummary.dsrPercent}%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              dari Pendapatan
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 truncate font-medium">
            {monthlySummary.dsrStatus === 'healthy'
              ? '✅ Sangat Sehat (Ideal <30%)'
              : monthlySummary.dsrStatus === 'caution'
              ? '⚠️ Waspada (Maks 30-40%)'
              : '🚨 Berisiko Tinggi (>40%)'}
          </div>
        </div>

        {/* Card 3: Total Sisa Hutang Pokok */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Sisa Pokok Kredit
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2.5">
            {formatRupiah(monthlySummary.totalRemainingDebt)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Dari {monthlySummary.activeCount} pos kewajiban yang belum lunas
          </div>
        </div>

        {/* Card 4: Simulasi Bebas Hutang Tercepat */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estimasi Selesai Semua
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2.5">
            {projectionSchedule.find((p) => p.monthTotal === 0)?.monthLabel || '12+ Bulan'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Target Bebas Hutang</span>
          </div>
        </div>
      </div>

      {/* DSR Calculator & Interactive Tool */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Simulasi Rasio Beban Cicilan (Debt Service Ratio)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Kesehatan Arus Kas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              Pakar keuangan merekomendasikan total cicilan bulanan tidak melebihi <strong>30% dari penghasilan bersih</strong> agar keuangan tetap fleksibel untuk tabungan, investasi, dan kebutuhan tak terduga.
            </p>

            {/* DSR Progress Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>0%</span>
                <span className="text-emerald-600 font-bold">30% (Batas Aman)</span>
                <span className="text-amber-600 font-bold">40% (Batas Waspada)</span>
                <span>100%</span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex">
                <div className="h-full bg-emerald-500 w-[30%] opacity-40"></div>
                <div className="h-full bg-amber-400 w-[10%] opacity-40"></div>
                <div className="h-full bg-rose-500 flex-1 opacity-40"></div>

                {/* Actual Marker */}
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-md transition-all z-10"
                  style={{ left: `calc(${Math.min(100, monthlySummary.dsrPercent)}% - 5px)` }}
                ></div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {monthlySummary.dsrMessage}
              </div>
            </div>
          </div>

          {/* Income Input Controller */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 w-full lg:w-80 shrink-0">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Penghasilan Bersih Bulanan (IDR)
            </label>
            <div className="relative">
              <input
                type="number"
                value={monthlyIncomeInput}
                onChange={(e) => setMonthlyIncomeInput(e.target.value)}
                placeholder="8000000"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
              <span>Sisa Penghasilan:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatRupiah(Math.max(0, monthlyIncome - monthlySummary.totalMonthlyObligation))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Monthly Installments Table / Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rincian Pos Kredit & Cicilan yang Wajib Dibayar Tiap Bulan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Daftar kredit aktif beserta nominal angsuran per bulan, tanggal jatuh tempo, dan sisa tenor.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
            {activeInstallments.length} Kredit Berjalan
          </span>
        </div>

        {activeInstallments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak Ada Kredit / Cicilan Barang yang Aktif
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Keuangan Anda bebas dari tanggungan cicilan barang bulanan!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInstallments.map((item) => {
              const tenor = item.tenorMonths || 12;
              const paid = item.paidMonths || 0;
              const remainingMonths = Math.max(0, tenor - paid);
              const monthlyAmount =
                item.monthlyInstallment || Math.round(item.remainingAmount / Math.max(1, remainingMonths));
              const percentPaid = Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100));

              return (
                <div
                  key={item.id}
                  className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.itemName || item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-medium">
                              {item.providerName || item.personName || 'Cicilan'}
                            </span>
                            {item.dueDayOfMonth && (
                              <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.2 rounded font-bold">
                                Tiap Tgl {item.dueDayOfMonth}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {paid} / {tenor} Bulan
                      </span>
                    </div>

                    {/* Amount Info */}
                    <div className="mt-4 grid grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Cicilan per Bulan:
                        </span>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {formatRupiah(monthlyAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Sisa Total Pokok:
                        </span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {formatRupiah(item.remainingAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Progres Pelunasan ({percentPaid}%)</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Sisa {remainingMonths} Bulan Lagi
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${percentPaid}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    {(() => {
                      const dueInfo = getNearestDueInfo(item.dueDayOfMonth, item.dueDate, item.status);
                      return (
                        <div className="text-[11px] flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            {dueInfo.dueDateStr ? `Jatuh tempo: ${dueInfo.formattedDate}` : `Bulan ke-${paid + 1}`}
                          </span>
                          {dueInfo.statusLabel && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${dueInfo.badgeClass}`}>
                              {dueInfo.statusLabel}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => onOpenPaymentModal(item, paid + 1)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                    >
                      <span>Bayar Angsuran</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 12-Month Projected Obligation Schedule */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Proyeksi Beban Cicilan 12 Bulan ke Depan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Simulasi penurunan total kewajiban bulanan saat kontrak cicilan barang lunas satu per satu.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            Beban Berkurang
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {projectionSchedule.map((month) => {
            const isZero = month.monthTotal === 0;
            const isPeak = month.index === 0;

            return (
              <div
                key={month.index}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  isZero
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : isPeak
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {month.monthLabel}
                </div>
                <div
                  className={`text-sm font-black mt-1.5 ${
                    isZero
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isPeak
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {isZero ? 'Rp 0' : formatRupiah(month.monthTotal, false)}
                </div>

                {month.endingCredits.length > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded leading-tight">
                    🎉 Lunas: {month.endingCredits[0]}
                  </div>
                )}
                {isZero && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Bebas Cicilan
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
