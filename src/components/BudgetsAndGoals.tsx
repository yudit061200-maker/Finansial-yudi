import React, { useState, useMemo } from 'react';
import { Budget, FinancialGoal, Transaction, Account } from '../types/finance';
import { formatRupiah, formatDateIndo, DEFAULT_CATEGORIES } from '../utils/formatters';
import confetti from 'canvas-confetti';
import { ConfirmModal } from './ConfirmModal';
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
  X,
  Edit2,
  Trash2,
  Coins,
  ArrowUpRight,
  TrendingUp,
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

const GOAL_CATEGORIES = [
  'Dana Darurat',
  'Rumah / Properti',
  'Kendaraan & Transportasi',
  'Liburan & Traveling',
  'Gadget & Elektronik',
  'Pendidikan & Kursus',
  'Pernikahan & Keluarga',
  'Investasi & Pensiun',
  'Modal Bisnis & Usaha',
  'Lainnya',
];

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
  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const [showContributeModal, setShowContributeModal] = useState<FinancialGoal | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; category: string } | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; title: string } | null>(null);

  // Budget Form state
  const [budgetCategory, setBudgetCategory] = useState('Makanan & Minuman');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetThreshold, setBudgetThreshold] = useState('85');

  // Goal Form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState('Dana Darurat');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('2026-12-31');
  const [goalMonthlyTarget, setGoalMonthlyTarget] = useState('');

  // Contribute to Goal state
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeAccountId, setContributeAccountId] = useState(accounts[0]?.id || '');

  // Open Add Budget
  const handleOpenAddBudget = () => {
    setEditingBudget(null);
    setBudgetCategory('Makanan & Minuman');
    setBudgetLimit('');
    setBudgetThreshold('85');
    setShowBudgetModal(true);
  };

  // Open Edit Budget
  const handleOpenEditBudget = (b: Budget) => {
    setEditingBudget(b);
    setBudgetCategory(b.category);
    setBudgetLimit(b.monthlyLimit.toString());
    setBudgetThreshold(Math.round(b.alertThreshold * 100).toString());
    setShowBudgetModal(true);
  };

  // Open Add Goal
  const handleOpenAddGoal = () => {
    setEditingGoal(null);
    setGoalTitle('');
    setGoalCategory('Dana Darurat');
    setGoalTargetAmount('');
    setGoalCurrentAmount('0');
    setGoalTargetDate('2026-12-31');
    setGoalMonthlyTarget('');
    setShowGoalModal(true);
  };

  // Open Edit Goal
  const handleOpenEditGoal = (g: FinancialGoal) => {
    setEditingGoal(g);
    setGoalTitle(g.title);
    setGoalCategory(g.category);
    setGoalTargetAmount(g.targetAmount.toString());
    setGoalCurrentAmount(g.currentAmount.toString());
    setGoalTargetDate(g.targetDate || new Date().toISOString().split('T')[0]);
    setGoalMonthlyTarget(g.monthlyContributionTarget ? g.monthlyContributionTarget.toString() : '');
    setShowGoalModal(true);
  };

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
      const thresholdVal = b.alertThreshold || 0.85;
      const isWarning = percentage >= Math.round(thresholdVal * 100);

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

  // Handle Save Budget (Add or Edit)
  const handleSaveBudget = () => {
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      alert('Harap masukkan nominal batas anggaran yang valid.');
      return;
    }

    const thresholdNumber = (parseFloat(budgetThreshold) || 85) / 100;

    let updated: Budget[];

    if (editingBudget) {
      // Edit existing budget
      updated = budgets.map((b) =>
        b.id === editingBudget.id
          ? {
              ...b,
              category: budgetCategory,
              monthlyLimit: limit,
              alertThreshold: thresholdNumber,
            }
          : b
      );
    } else {
      // Create new or update category if already exists
      const existingIndex = budgets.findIndex((b) => b.category === budgetCategory);
      if (existingIndex >= 0) {
        updated = [...budgets];
        updated[existingIndex].monthlyLimit = limit;
        updated[existingIndex].alertThreshold = thresholdNumber;
      } else {
        const newB: Budget = {
          id: `bg-${Date.now()}`,
          category: budgetCategory,
          monthlyLimit: limit,
          alertThreshold: thresholdNumber,
          color: '#10B981',
          icon: 'Target',
        };
        updated = [...budgets, newB];
      }
    }

    onUpdateBudgets(updated);
    setShowBudgetModal(false);
    setEditingBudget(null);
  };

  const handleDeleteBudget = (id: string, category: string) => {
    setBudgetToDelete({ id, category });
  };

  const handleExecuteDeleteBudget = () => {
    if (!budgetToDelete) return;
    if (onDeleteBudget) {
      onDeleteBudget(budgetToDelete.id);
    } else {
      onUpdateBudgets(budgets.filter((b) => b.id !== budgetToDelete.id));
    }
    setBudgetToDelete(null);
  };

  // Handle Save Goal (Add or Edit)
  const handleSaveGoal = () => {
    const target = parseFloat(goalTargetAmount);
    const current = parseFloat(goalCurrentAmount) || 0;
    const monthly = parseFloat(goalMonthlyTarget) || Math.max(0, Math.round((target - current) / 6));

    if (!goalTitle.trim() || isNaN(target) || target <= 0) {
      alert('Harap isi judul target dan nominal target dengan benar.');
      return;
    }

    const isCompleted = current >= target;

    if (editingGoal) {
      // Edit existing goal
      const updatedGoals = goals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              title: goalTitle.trim(),
              category: goalCategory,
              targetAmount: target,
              currentAmount: current,
              targetDate: goalTargetDate,
              monthlyContributionTarget: monthly,
              isCompleted: isCompleted,
            }
          : g
      );
      onUpdateGoals(updatedGoals);
    } else {
      // Create new goal
      const newG: FinancialGoal = {
        id: `goal-${Date.now()}`,
        title: goalTitle.trim(),
        category: goalCategory,
        targetAmount: target,
        currentAmount: current,
        targetDate: goalTargetDate,
        monthlyContributionTarget: monthly,
        color: '#10B981',
        icon: 'ShieldCheck',
        isCompleted: isCompleted,
      };
      onUpdateGoals([...goals, newG]);
    }

    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = (id: string, title: string) => {
    setGoalToDelete({ id, title });
  };

  const handleExecuteDeleteGoal = () => {
    if (!goalToDelete) return;
    if (onDeleteGoal) {
      onDeleteGoal(goalToDelete.id);
    } else {
      onUpdateGoals(goals.filter((g) => g.id !== goalToDelete.id));
    }
    setGoalToDelete(null);
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

    // Record a savings transaction
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
    <div className="space-y-8 pb-12 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Anggaran Bulanan & Target Finansial
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/80">
              <Sparkles className="w-3.5 h-3.5" />
              Kontrol Finansial
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Pantau batas pengeluaran per kategori agar tidak overbudget dan kelola target impian Anda secara fleksibel.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenAddBudget}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>+ Set Anggaran</span>
          </button>
          <button
            onClick={handleOpenAddGoal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-md shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Anggaran Kategori Bulan Ini</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Batas pengeluaran per kategori bulan berjalan (dapat diedit sewaktu-waktu)
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
            {budgets.length} Kategori Dipantau
          </span>
        </div>

        {budgets.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <Coins className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada anggaran kategori</p>
            <p className="text-xs text-slate-400 mt-1">Klik "+ Set Anggaran" untuk membuat batas pengeluaran bulanan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetProgressList.map((b) => (
              <div
                key={b.id}
                className={`border rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all ${
                  b.isOver
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                    : b.isWarning
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate mr-2">
                      {b.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {b.isOver ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Overbudget
                        </span>
                      ) : b.isWarning ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Peringatan {b.percentage}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Aman ({b.percentage}%)
                        </span>
                      )}

                      {/* Edit Budget Button */}
                      <button
                        onClick={() => handleOpenEditBudget(b)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Anggaran"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Budget Button */}
                      <button
                        onClick={() => handleDeleteBudget(b.id, b.category)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Hapus Anggaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Terpakai:</div>
                      <div
                        className={`text-base font-black ${
                          b.isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatRupiah(b.spent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Batas Anggaran:</div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatRupiah(b.monthlyLimit)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        b.isOver ? 'bg-rose-500' : b.isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Sisa Kuota:</span>
                  <span
                    className={`font-bold ${
                      b.remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
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
        )}
      </div>

      {/* Section 2: Financial Goals (Target Finansial) */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Target Finansial & Tabungan Impian</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Kelola dan sesuaikan target tabungan masa depan Anda
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700">
            {goals.length} Target Aktif
          </span>
        </div>

        {goals.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <PiggyBank className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada target tabungan</p>
            <p className="text-xs text-slate-400 mt-1">Klik "+ Buat Target Tabungan" untuk mulai merencanakan impian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((goal) => {
              const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                          <PiggyBank className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{goal.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{goal.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {percentage >= 100 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Tercapai!
                          </span>
                        )}

                        {/* Edit Goal Button */}
                        <button
                          onClick={() => handleOpenEditGoal(goal)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Target Tabungan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Goal Button */}
                        <button
                          onClick={() => handleDeleteGoal(goal.id, goal.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {formatRupiah(goal.currentAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Target</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatRupiah(goal.targetAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>{percentage}% Tercapai</span>
                      <span>Sisa: {formatRupiah(remaining)}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Target Tanggal:
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{formatDateIndo(goal.targetDate)}</span>
                    </div>

                    <button
                      onClick={() => setShowContributeModal(goal)}
                      className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Tabungan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Add/Edit Budget */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBudget ? 'Edit Batas Anggaran Kategori' : 'Atur Batas Anggaran Kategori'}
              </h3>
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori Pengeluaran
              </label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              >
                {DEFAULT_CATEGORIES.expense.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Batas Pengeluaran Bulanan (IDR)
              </label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="Contoh: 2500000"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ambang Peringatan Overbudget (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={budgetThreshold}
                  onChange={(e) => setBudgetThreshold(e.target.value)}
                  placeholder="85"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
                <span className="text-xs text-slate-500 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Peringatan kuning akan muncul ketika pengeluaran mencapai persentase ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                {editingBudget ? 'Simpan Perubahan' : 'Simpan Anggaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add/Edit Goal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Target Tabungan' : 'Buat Target Tabungan Baru'}
              </h3>
              <button
                onClick={() => {
                  setShowGoalModal(false);
                  setEditingGoal(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama / Judul Target
              </label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Contoh: Liburan ke Labuan Bajo, DP Mobil, Dana Darurat 6 Bulan"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori Target
              </label>
              <select
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              >
                {GOAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nominal Target (IDR)
                </label>
                <input
                  type="number"
                  value={goalTargetAmount}
                  onChange={(e) => setGoalTargetAmount(e.target.value)}
                  placeholder="20000000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Saldo Terkumpul (IDR)
                </label>
                <input
                  type="number"
                  value={goalCurrentAmount}
                  onChange={(e) => setGoalCurrentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Tanggal Dicapai
                </label>
                <input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Nabung/Bulan (IDR)
                </label>
                <input
                  type="number"
                  value={goalMonthlyTarget}
                  onChange={(e) => setGoalMonthlyTarget(e.target.value)}
                  placeholder="Otomatis dihitung"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowGoalModal(false);
                  setEditingGoal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveGoal}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                {editingGoal ? 'Simpan Perubahan' : 'Buat Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Contribute to Goal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Tabungan: {showContributeModal.title}
              </h3>
              <button
                onClick={() => setShowContributeModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nominal yang Ditabung (IDR)
              </label>
              <input
                type="number"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="Contoh: 1000000"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Sumber Dana Rekening / Dompet:
              </label>
              <select
                value={contributeAccountId}
                onChange={(e) => setContributeAccountId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatRupiah(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowContributeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveContribution}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all font-bold cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                Setor Tabungan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Budget Confirmation Modal */}
      <ConfirmModal
        isOpen={!!budgetToDelete}
        title="Hapus Batas Anggaran?"
        message={
          budgetToDelete
            ? `Apakah Anda yakin ingin menghapus batas anggaran untuk kategori "${budgetToDelete.category}"?`
            : ''
        }
        confirmText="Ya, Hapus Anggaran"
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={handleExecuteDeleteBudget}
        onClose={() => setBudgetToDelete(null)}
      />

      {/* Delete Goal Confirmation Modal */}
      <ConfirmModal
        isOpen={!!goalToDelete}
        title="Hapus Target Tabungan?"
        message={
          goalToDelete
            ? `Apakah Anda yakin ingin menghapus target tabungan "${goalToDelete.title}"?`
            : ''
        }
        confirmText="Ya, Hapus Target"
        cancelText="Batal"
        variant="danger"
        icon="trash"
        onConfirm={handleExecuteDeleteGoal}
        onClose={() => setGoalToDelete(null)}
      />
    </div>
  );
};
