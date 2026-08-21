import React, { useState, useMemo } from 'react';
import { Budget, FinancialGoal, Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateIndo, DEFAULT_CATEGORIES } from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Target,
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Home,
  Plane,
  Sparkles,
  Calendar,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';

interface BudgetsAndGoalsProps {
  budgets: Budget[];
  goals: FinancialGoal[];
  transactions: Transaction[];
  accounts: Account[];
  onUpdateBudgets: (budgets: Budget[]) => void;
  onUpdateGoals: (goals: FinancialGoal[]) => void;
  onDeleteBudget?: (budgetId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export const BudgetsAndGoals: React.FC<BudgetsAndGoalsProps> = ({
  budgets,
  goals,
  transactions,
  accounts,
  onUpdateBudgets,
  onUpdateGoals,
  onDeleteBudget,
  onDeleteGoal,
  onAddTransaction,
}) => {
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState<FinancialGoal | null>(null);

  // New Budget Form state
  const [newBudgetCategory, setNewBudgetCategory] = useState('Makanan & Minuman');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  // New Goal Form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Dana Darurat');
  const [newGoalTargetAmount, setNewGoalTargetAmount] = useState('');
  const [newGoalCurrentAmount, setNewGoalCurrentAmount] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('2026-12-31');
  const [newGoalMonthlyTarget, setNewGoalMonthlyTarget] = useState('');

  // Contribute to Goal state
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeAccountId, setContributeAccountId] = useState(accounts[0]?.id || '');

  // Calculate current month's expenses per category for budgets
  const budgetProgressList = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spentMap = new Map<string, number>();

    transactions
      .filter((t) => {
        if (t.type !== 'expense') return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .forEach((t) => {
        spentMap.set(t.category, (spentMap.get(t.category) || 0) + t.amount);
      });

    return budgets.map((b) => {
      const spent = spentMap.get(b.category) || 0;
      const percentage = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
      const remaining = b.monthlyLimit - spent;
      const isOver = spent > b.monthlyLimit;
      const isWarning = percentage >= Math.round(b.alertThreshold * 100);

      return {
        ...b,
        spent,
        percentage,
        remaining,
        isOver,
        isWarning,
      };
    });
  }, [budgets, transactions]);

  // Handle Save New Budget
  const handleSaveNewBudget = () => {
    const limit = parseFloat(newBudgetLimit);
    if (isNaN(limit) || limit <= 0) {
      alert('Harap masukkan nominal batas anggaran yang valid.');
      return;
    }

    const existingIndex = budgets.findIndex((b) => b.category === newBudgetCategory);
    let updated: Budget[];

    if (existingIndex >= 0) {
      updated = [...budgets];
      updated[existingIndex].monthlyLimit = limit;
    } else {
      const newB: Budget = {
        id: `bg-${Date.now()}`,
        category: newBudgetCategory,
        monthlyLimit: limit,
        alertThreshold: 0.85,
        color: '#10B981',
        icon: 'Target',
      };
      updated = [...budgets, newB];
    }

    onUpdateBudgets(updated);
    setShowAddBudgetModal(false);
    setNewBudgetLimit('');
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm('Hapus anggaran kategori ini?')) {
      if (onDeleteBudget) {
        onDeleteBudget(id);
      } else {
        onUpdateBudgets(budgets.filter((b) => b.id !== id));
      }
    }
  };

  const handleDeleteGoal = (id: string, title: string) => {
    if (confirm(`Hapus target tabungan "${title}"?`)) {
      if (onDeleteGoal) {
        onDeleteGoal(id);
      } else {
        onUpdateGoals(goals.filter((g) => g.id !== id));
      }
    }
  };

  // Handle Save New Goal
  const handleSaveNewGoal = () => {
    const target = parseFloat(newGoalTargetAmount);
    const current = parseFloat(newGoalCurrentAmount) || 0;
    const monthly = parseFloat(newGoalMonthlyTarget) || Math.round((target - current) / 6);

    if (!newGoalTitle.trim() || isNaN(target) || target <= 0) {
      alert('Harap isi judul target dan nominal target dengan benar.');
      return;
    }

    const newG: FinancialGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      targetAmount: target,
      currentAmount: current,
      targetDate: newGoalTargetDate,
      monthlyContributionTarget: monthly,
      color: '#10B981',
      icon: 'ShieldCheck',
    };

    onUpdateGoals([...goals, newG]);
    setShowAddGoalModal(false);
    setNewGoalTitle('');
    setNewGoalTargetAmount('');
    setNewGoalCurrentAmount('');
  };

  // Handle Add Contribution to Goal
  const handleSaveContribution = () => {
    if (!showContributeModal) return;
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal tabungan yang valid.');
      return;
    }

    const matchedAcc = accounts.find((a) => a.id === contributeAccountId) || accounts[0];

    // Update goal current amount
    const updatedGoals = goals.map((g) => {
      if (g.id === showContributeModal.id) {
        const newCurrent = g.currentAmount + amount;
        const isReached = newCurrent >= g.targetAmount;
        if (isReached) {
          // Trigger confetti!
          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
        }
        return {
          ...g,
          currentAmount: newCurrent,
          isCompleted: isReached,
        };
      }
      return g;
    });

    onUpdateGoals(updatedGoals);

    // Also record a transfer/savings transaction
    onAddTransaction({
      date: new Date().toISOString().split('T')[0],
      title: `Nabung Target: ${showContributeModal.title}`,
      amount: amount,
      type: 'expense',
      category: 'Investasi & Tabungan',
      accountId: matchedAcc.id,
      paymentMethod: `Tabungan (${matchedAcc.name})`,
      source: 'manual',
      notes: `Alokasi tabungan untuk target ${showContributeModal.title}`,
      tags: ['Target-Goal', 'Nabung'],
      isVerified: true,
    });

    setShowContributeModal(null);
    setContributeAmount('');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Anggaran Bulanan & Target Finansial</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5" />
              Kontrol Finansial
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pantau batas pengeluaran per kategori agar tidak overbudget dan capai target impian Anda lebih cepat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddBudgetModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Set Anggaran</span>
          </button>
          <button
            onClick={() => setShowAddGoalModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <PiggyBank className="w-4 h-4" />
            <span>+ Buat Target Tabungan</span>
          </button>
        </div>
      </div>

      {/* Section 1: Category Budgets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">Anggaran Kategori Bulan Ini</h2>
            <p className="text-xs text-slate-500 font-medium">Batas pengeluaran per kategori bulan berjalan</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{budgets.length} Kategori Dipantau</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetProgressList.map((b) => (
            <div
              key={b.id}
              className={`bg-white border rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-colors ${
                b.isOver
                  ? 'border-rose-300 bg-rose-50/20'
                  : b.isWarning
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate mr-2">{b.category}</span>
                  <div className="flex items-center gap-1">
                    {b.isOver ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overbudget
                      </span>
                    ) : b.isWarning ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Peringatan {b.percentage}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aman ({b.percentage}%)
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                      title="Hapus anggaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Terpakai:</div>
                    <div
                      className={`text-base font-black ${
                        b.isOver ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatRupiah(b.spent)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">Batas Anggaran:</div>
                    <div className="text-xs font-bold text-slate-700">
                      {formatRupiah(b.monthlyLimit)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.isOver ? 'bg-rose-500' : b.isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Sisa Kuota:</span>
                <span
                  className={`font-bold ${
                    b.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {b.remaining < 0
                    ? `Melebihi ${formatRupiah(Math.abs(b.remaining))}`
                    : `${formatRupiah(b.remaining)} lagi`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Financial Goals (Target Finansial) */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">Target Finansial & Tabungan</h2>
            <p className="text-xs text-slate-500 font-medium">Tabungan terencana untuk impian masa depan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">{goal.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{goal.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {percentage >= 100 && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Tercapai!
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.title)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Target Tabungan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">
                        Terkumpul Saat Ini
                      </div>
                      <div className="text-lg font-black text-indigo-600 mt-0.5">
                        {formatRupiah(goal.currentAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Target</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {formatRupiah(goal.targetAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3.5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{percentage}% Tercapai</span>
                    <span>Sisa: {formatRupiah(remaining)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Target Tanggal:
                    </span>
                    <span className="text-slate-800 font-bold">{formatDateIndo(goal.targetDate)}</span>
                  </div>

                  <button
                    onClick={() => setShowContributeModal(goal)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Tabungan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal 1: Add/Edit Budget */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Atur Batas Anggaran Kategori</h3>
              <button
                onClick={() => setShowAddBudgetModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kategori Pengeluaran
              </label>
              <select
                value={newBudgetCategory}
                onChange={(e) => setNewBudgetCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {DEFAULT_CATEGORIES.expense.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Batas Pengeluaran Bulanan (IDR)
              </label>
              <input
                type="number"
                value={newBudgetLimit}
                onChange={(e) => setNewBudgetLimit(e.target.value)}
                placeholder="Contoh: 2500000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddBudgetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNewBudget}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100"
              >
                Simpan Anggaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Goal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Buat Target Tabungan Baru</h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama / Judul Target
              </label>
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Contoh: Liburan ke Labuan Bajo, DP Mobil"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nominal Target (IDR)
                </label>
                <input
                  type="number"
                  value={newGoalTargetAmount}
                  onChange={(e) => setNewGoalTargetAmount(e.target.value)}
                  placeholder="20000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Saldo Saat Ini (IDR)
                </label>
                <input
                  type="number"
                  value={newGoalCurrentAmount}
                  onChange={(e) => setNewGoalCurrentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Tanggal Dicapai
              </label>
              <input
                type="date"
                value={newGoalTargetDate}
                onChange={(e) => setNewGoalTargetDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNewGoal}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100"
              >
                Buat Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Contribute to Goal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Tambah Tabungan: {showContributeModal.title}
              </h3>
              <button
                onClick={() => setShowContributeModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nominal yang Ditabung (IDR)
              </label>
              <input
                type="number"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="Contoh: 1000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sumber Dana Rekening / Dompet:
              </label>
              <select
                value={contributeAccountId}
                onChange={(e) => setContributeAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatRupiah(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowContributeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveContribution}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100"
              >
                Setor Tabungan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
