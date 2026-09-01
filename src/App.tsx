import React, { useState, useEffect, useMemo } from 'react';
import {
  Account,
  Transaction,
  Budget,
  FinancialGoal,
  ChatMessage,
  FinancialHealthScore,
  DebtRecord,
} from './types/finance';
import {
  seedFirestoreIfEmpty,
  subscribeAccounts,
  subscribeTransactions,
  subscribeBudgets,
  subscribeGoals,
  subscribeDebts,
  subscribeChatHistory,
  saveAccountToFirestore,
  deleteAccountFromFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveAllBudgetsToFirestore,
  deleteBudgetFromFirestore,
  saveAllGoalsToFirestore,
  deleteGoalFromFirestore,
  saveDebtToFirestore,
  deleteDebtFromFirestore,
  addChatMessageToFirestore,
  resetAllFirestoreData,
  updateAccountBalanceInFirestore,
  deleteTransactionsByAccountId,
} from './services/firebaseDb';
import { Header, NavTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './components/Dashboard';
import { DebtReceivable } from './components/DebtReceivable';
import { AiChatInput } from './components/AiChatInput';
import { ReceiptScanner } from './components/ReceiptScanner';
import { TransactionList } from './components/TransactionList';
import { BudgetsAndGoals } from './components/BudgetsAndGoals';
import { SalaryCalculator } from './components/SalaryCalculator';
import { TransactionModal } from './components/TransactionModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { AccountModal } from './components/AccountModal';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { useTheme } from './context/ThemeContext';
import { getCashSummary } from './utils/cashflow';
import { isDebtPaid, formatRupiah } from './utils/formatters';
import { RotateCcw, Check, CloudCheck, Loader2, Smartphone } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const { isThemeModalOpen, setIsThemeModalOpen } = useTheme();

  // Privacy Mode (hide/show sensitive amounts)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arthasmart_privacy') === 'true';
    } catch {
      return false;
    }
  });

  const handleTogglePrivacy = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('arthasmart_privacy', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Core Financial State loaded directly from Cloud Firestore
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Modals & Active Selections
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxDefaultType, setNewTxDefaultType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [newTxDefaultDate, setNewTxDefaultDate] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Computed overview figures for sidebar
  const totalNetWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  const cashSummary = useMemo(() => {
    return getCashSummary(transactions, 0);
  }, [transactions]);

  const activeDebtsCount = useMemo(() => {
    return debts.filter((d) => !isDebtPaid(d)).length;
  }, [debts]);

  // Global keyboard shortcut for Command Palette (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Android App Shortcuts & URL Query parameters
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      if (action === 'new-transaction') {
        setIsNewTxModalOpen(true);
      } else if (action === 'scan-receipt') {
        setActiveTab('receipt');
      } else if (action === 'ai-chat') {
        setActiveTab('aichat');
      } else if (action === 'debts') {
        setActiveTab('debts');
      }
    } catch {
      // ignore in iframe environments
    }
  }, []);

  // Real-time Firestore synchronization on mount
  useEffect(() => {
    // Check and seed initial data once if this Firestore project is brand new
    seedFirestoreIfEmpty()
      .then(() => {
        setIsDbLoaded(true);
      })
      .catch((err) => {
        console.warn('Firestore seed notice:', err);
        setIsDbLoaded(true);
      });

    const unsubAccounts = subscribeAccounts((items) => {
      setAccounts(items);
      setIsDbLoaded(true);
    });

    const unsubTransactions = subscribeTransactions((items) => {
      setTransactions(items);
    });

    const unsubBudgets = subscribeBudgets((items) => {
      setBudgets(items);
    });

    const unsubGoals = subscribeGoals((items) => {
      setGoals(items);
    });

    const unsubDebts = subscribeDebts((items) => {
      setDebts(items);
    });

    const unsubChat = subscribeChatHistory((items) => {
      if (items.length > 0) {
        setChatHistory(items);
      } else {
        setChatHistory([
          {
            id: 'msg-welcome',
            sender: 'ai',
            text: 'Halo! 👋 Data keuangan Anda tersimpan aman di cloud Firebase Firestore secara real-time.\n\nAnda bisa mengetik pengeluaran atau hutang secara alami seperti:\n• *"Makan siang Padang 28rb bayar QRIS BCA"*\n• *"Pinjamkan 500rb ke Budi jatuh tempo akhir bulan"*\n• *"Transfer 500rb ke Bibit untuk tabungan"*\n\nData akan langsung tersinkronisasi ke database cloud.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubDebts();
      unsubChat();
    };
  }, []);

  // Dynamically calculate financial health score based on active data
  const healthScore: FinancialHealthScore = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
    const monthlyExpense = totalExpense > 0 ? totalExpense : 1;
    const emergencyMonths = Number((totalNetWorth / monthlyExpense).toFixed(1));

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    let score = 75;
    if (savingsRate >= 30) score += 15;
    else if (savingsRate >= 15) score += 8;
    else if (savingsRate < 0) score -= 15;

    if (emergencyMonths >= 6) score += 10;
    else if (emergencyMonths >= 3) score += 5;

    const clampedScore = Math.min(100, Math.max(20, score));
    const status =
      clampedScore >= 85
        ? 'Sangat Sehat & Stabil'
        : clampedScore >= 70
        ? 'Sehat & Terkendali'
        : 'Perlu Perhatian & Penghematan';

    const insights: string[] = [];
    if (accounts.length === 0) {
      insights.push('Belum ada akun rekening atau dompet digital yang terdaftar.');
    } else {
      insights.push(`Tersedia ${accounts.length} akun aktif dengan total saldo terdata.`);
    }

    if (transactions.length > 0) {
      insights.push(`Total ${transactions.length} transaksi tercatat dan tersinkronisasi di Firebase Firestore.`);
    } else {
      insights.push('Mulai catat transaksi pengeluaran pertama Anda via AI Chat atau Scan Struk.');
    }

    if (emergencyMonths >= 3) {
      insights.push(`Dana likuiditas mencakup estimasi pengeluaran ~${emergencyMonths} bulan.`);
    }

    return {
      score: clampedScore,
      status,
      savingsRate,
      emergencyFundMonths: emergencyMonths,
      budgetAdherence: 92,
      insights,
    };
  }, [accounts, transactions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Add a new transaction and update the corresponding account balance in Firestore
  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    let effectiveAccountId = newTxData.accountId;
    let targetAccount = accounts.find((a) => a.id === effectiveAccountId);

    if (!targetAccount) {
      if (accounts.length > 0) {
        targetAccount = accounts[0];
        effectiveAccountId = targetAccount.id;
      } else {
        // Fallback default cash account if no accounts exist
        const defaultCashAcc: Account = {
          id: 'acc-cash',
          name: 'Dompet Tunai (Cash)',
          type: 'cash',
          provider: 'cash',
          accountNumberMasked: 'Tunai Fisik',
          balance: 0,
          currency: 'IDR',
          color: '#F59E0B',
          icon: 'Banknote',
        };
        targetAccount = defaultCashAcc;
        effectiveAccountId = defaultCashAcc.id;
        try {
          await saveAccountToFirestore(defaultCashAcc);
        } catch (e) {
          console.warn('Could not auto-save default cash account:', e);
        }
      }
    }

    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      accountId: effectiveAccountId,
    };

    // Calculate updated account balances
    let updatedTargetAccount: Account | undefined;
    let updatedDestAccount: Account | undefined;

    if (targetAccount) {
      if (newTx.type === 'expense') {
        updatedTargetAccount = { ...targetAccount, balance: targetAccount.balance - newTx.amount };
      } else if (newTx.type === 'income') {
        updatedTargetAccount = { ...targetAccount, balance: targetAccount.balance + newTx.amount };
      } else if (newTx.type === 'transfer') {
        updatedTargetAccount = { ...targetAccount, balance: targetAccount.balance - newTx.amount };
      }
    }

    if (newTx.type === 'transfer' && newTx.destinationAccountId) {
      const destAcc = accounts.find((a) => a.id === newTx.destinationAccountId);
      if (destAcc) {
        updatedDestAccount = { ...destAcc, balance: destAcc.balance + newTx.amount };
      }
    }

    try {
      await saveTransactionToFirestore(newTx);
      if (updatedTargetAccount) await saveAccountToFirestore(updatedTargetAccount);
      if (updatedDestAccount) await saveAccountToFirestore(updatedDestAccount);

      showToast(`Transaksi "${newTx.title}" berhasil disimpan ke Firebase!`);
    } catch (err: any) {
      console.error('Error saving transaction to Firestore:', err);
      showToast(`Gagal menyimpan transaksi ke cloud: ${err?.message || 'Periksa koneksi'}`);
    }
  };

  // Update existing transaction in Firestore
  const handleUpdateTransaction = async (updatedTx: Transaction | Omit<Transaction, 'id'>) => {
    if (!('id' in updatedTx)) return;
    const oldTx = transactions.find((t) => t.id === updatedTx.id);

    try {
      await saveTransactionToFirestore(updatedTx as Transaction);

      // Revert old transaction effect and apply new transaction effect to account balances
      if (oldTx) {
        const oldAcc = accounts.find((a) => a.id === oldTx.accountId);
        if (oldAcc) {
          let rolledBackBalance = oldAcc.balance;
          if (oldTx.type === 'expense') rolledBackBalance += oldTx.amount;
          if (oldTx.type === 'income') rolledBackBalance -= oldTx.amount;
          if (oldTx.type === 'transfer') rolledBackBalance += oldTx.amount;

          if (oldTx.accountId === updatedTx.accountId) {
            if (updatedTx.type === 'expense') rolledBackBalance -= updatedTx.amount;
            if (updatedTx.type === 'income') rolledBackBalance += updatedTx.amount;
            if (updatedTx.type === 'transfer') rolledBackBalance -= updatedTx.amount;
          }

          await saveAccountToFirestore({ ...oldAcc, balance: rolledBackBalance });
        }

        if (oldTx.accountId !== updatedTx.accountId) {
          const newAcc = accounts.find((a) => a.id === updatedTx.accountId);
          if (newAcc) {
            let newBalance = newAcc.balance;
            if (updatedTx.type === 'expense') newBalance -= updatedTx.amount;
            if (updatedTx.type === 'income') newBalance += updatedTx.amount;
            if (updatedTx.type === 'transfer') newBalance -= updatedTx.amount;
            await saveAccountToFirestore({ ...newAcc, balance: newBalance });
          }
        }
      }

      showToast('Transaksi diperbarui di Firebase Firestore!');
      setEditingTransaction(null);
    } catch (err) {
      console.error('Error updating transaction in Firestore:', err);
      showToast('Gagal memperbarui transaksi.');
    }
  };

  // Delete transaction from Firestore
  const handleDeleteTransaction = async (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return;

    // Optimistic UI updates
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));

    const acc = accounts.find((a) => a.id === tx.accountId);
    let updatedAcc: Account | undefined;
    if (acc) {
      let rolledBalance = acc.balance;
      if (tx.type === 'expense') rolledBalance += tx.amount;
      if (tx.type === 'income') rolledBalance -= tx.amount;
      if (tx.type === 'transfer') rolledBalance += tx.amount;
      updatedAcc = { ...acc, balance: rolledBalance };
      setAccounts((prev) => prev.map((a) => (a.id === updatedAcc!.id ? updatedAcc! : a)));
    }

    let updatedDest: Account | undefined;
    if (tx.type === 'transfer' && tx.destinationAccountId) {
      const destAcc = accounts.find((a) => a.id === tx.destinationAccountId);
      if (destAcc) {
        updatedDest = { ...destAcc, balance: destAcc.balance - tx.amount };
        setAccounts((prev) => prev.map((a) => (a.id === updatedDest!.id ? updatedDest! : a)));
      }
    }

    try {
      await deleteTransactionFromFirestore(transactionId);

      if (updatedAcc) {
        await saveAccountToFirestore(updatedAcc);
      }
      if (updatedDest) {
        await saveAccountToFirestore(updatedDest);
      }

      showToast('Transaksi telah dihapus permanen dari Firebase Firestore.');
    } catch (err) {
      console.error('Error deleting transaction in Firestore:', err);
      showToast('Gagal menghapus transaksi.');
    }
  };

  // Debt & Receivable Handlers (Firestore)
  const handleSaveDebt = async (debt: DebtRecord) => {
    try {
      await saveDebtToFirestore(debt);
      showToast(
        debt.type === 'payable'
          ? `Catatan hutang "${debt.title}" berhasil disimpan di cloud!`
          : `Catatan piutang "${debt.title}" berhasil disimpan di cloud!`
      );
    } catch (err) {
      console.error('Error saving debt to Firestore:', err);
      showToast('Gagal menyimpan catatan hutang/piutang ke cloud.');
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    try {
      await deleteDebtFromFirestore(debtId);
      showToast('Catatan hutang/piutang dihapus dari Firebase Firestore.');
    } catch (err) {
      console.error('Error deleting debt from Firestore:', err);
      showToast('Gagal menghapus catatan.');
    }
  };

  // Account Management Handlers (Firestore)
  const handleSaveAccount = async (account: Account) => {
    try {
      await saveAccountToFirestore(account);
      showToast(
        editingAccount
          ? `Akun "${account.name}" diperbarui di Firebase!`
          : `Akun "${account.name}" tersimpan di Firebase Firestore!`
      );
    } catch (err) {
      console.error('Error saving account to Firestore:', err);
      showToast('Gagal menyimpan akun ke Firestore.');
    }
  };

  const handleResetAccountBalance = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    try {
      await updateAccountBalanceInFirestore(accountId, 0);
      showToast(`Saldo akun "${acc?.name || ''}" telah di-reset menjadi Rp 0.`);
    } catch (err) {
      console.error('Error resetting account balance in Firestore:', err);
      showToast('Gagal me-reset saldo akun.');
    }
  };

  const handleClearAccountTransactions = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    try {
      const count = await deleteTransactionsByAccountId(accountId);
      await updateAccountBalanceInFirestore(accountId, 0);
      showToast(`${count} transaksi pada akun "${acc?.name || ''}" dibersihkan dan saldo di-reset ke Rp 0.`);
    } catch (err) {
      console.error('Error clearing account transactions in Firestore:', err);
      showToast('Gagal membersihkan transaksi akun.');
    }
  };

  const handleDeleteAccount = async (accountId: string, deleteLinkedTransactions = false) => {
    const accToDelete = accounts.find((a) => a.id === accountId);
    try {
      await deleteAccountFromFirestore(accountId, deleteLinkedTransactions);
      showToast(
        deleteLinkedTransactions
          ? `Akun "${accToDelete?.name || ''}" beserta transaksi terkait berhasil dihapus.`
          : `Akun "${accToDelete?.name || ''}" berhasil dihapus dari Firebase Firestore.`
      );
    } catch (err) {
      console.error('Error deleting account from Firestore:', err);
      showToast('Gagal menghapus akun.');
    }
  };

  // Budget updates to Firestore
  const handleUpdateBudgets = async (updatedBudgets: Budget[]) => {
    try {
      await saveAllBudgetsToFirestore(updatedBudgets);
      showToast('Anggaran diperbarui di Firebase Firestore!');
    } catch (err) {
      console.error('Error saving budgets to Firestore:', err);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      await deleteBudgetFromFirestore(budgetId);
      showToast('Anggaran kategori dihapus dari Firebase Firestore.');
    } catch (err) {
      console.error('Error deleting budget from Firestore:', err);
    }
  };

  // Goal updates to Firestore
  const handleUpdateGoals = async (updatedGoals: FinancialGoal[]) => {
    try {
      await saveAllGoalsToFirestore(updatedGoals);
      showToast('Target tabungan diperbarui di Firebase Firestore!');
    } catch (err) {
      console.error('Error saving goals to Firestore:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalFromFirestore(goalId);
      showToast('Target tabungan dihapus dari Firebase Firestore.');
    } catch (err) {
      console.error('Error deleting goal from Firestore:', err);
    }
  };

  // Reset to initial demo data in Firestore
  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleExecuteReset = async () => {
    try {
      await resetAllFirestoreData();
      showToast('Data di Firebase Firestore berhasil di-reset ke data bawaan.');
    } catch (err) {
      console.error('Error resetting Firestore data:', err);
      showToast('Gagal me-reset data di Firestore.');
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F19] bg-mesh-light dark:bg-mesh-dark text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Executive Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onOpenQuickScan={() => setActiveTab('receipt')}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onResetData={handleResetData}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        isDbConnected={isDbLoaded}
        totalNetWorth={totalNetWorth}
        currentSisaKas={cashSummary.currentSisaKas}
        activeDebtsCount={activeDebtsCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Email Verification Required Banner */}
        <EmailVerificationBanner />

        {/* Cockpit Topbar */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
          onOpenQuickScan={() => setActiveTab('receipt')}
          onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacy={handleTogglePrivacy}
          isDbConnected={isDbLoaded}
        />

        {/* Dynamic Main Content Workspace */}
        <main className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 max-w-[1600px] mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              accounts={accounts}
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              debts={debts}
              healthScore={healthScore}
              isPrivacyMode={isPrivacyMode}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewTransaction={(date) => {
                setEditingTransaction(null);
                setNewTxDefaultDate(date);
                setNewTxDefaultType('expense');
                setIsNewTxModalOpen(true);
              }}
              onSelectTransaction={(tx) => setSelectedTransactionDetail(tx)}
              onAddNewAccount={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              onEditAccount={(acc) => {
                setEditingAccount(acc);
                setIsAccountModalOpen(true);
              }}
              onDeleteAccount={handleDeleteAccount}
              onResetAccountBalance={handleResetAccountBalance}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              accounts={accounts}
              debts={debts}
              isPrivacyMode={isPrivacyMode}
              onOpenNewTransaction={(type) => {
                setEditingTransaction(null);
                setNewTxDefaultType(type || 'expense');
                setIsNewTxModalOpen(true);
              }}
              onNavigateToDebts={() => setActiveTab('debts')}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsNewTxModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onSelectTransaction={(tx) => setSelectedTransactionDetail(tx)}
            />
          )}

          {activeTab === 'debts' && (
            <DebtReceivable
              debts={debts}
              accounts={accounts}
              transactions={transactions}
              onSaveDebt={handleSaveDebt}
              onDeleteDebt={handleDeleteDebt}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'aichat' && (
            <AiChatInput
              accounts={accounts}
              chatHistory={chatHistory}
              onSaveChatMessage={async (msg) => {
                try {
                  await addChatMessageToFirestore(msg);
                } catch (err) {
                  console.error('Error saving chat message to Firestore:', err);
                }
              }}
              onAddTransaction={handleAddTransaction}
              financialContextSummary={{
                totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
                accountsCount: accounts.length,
                debtsCount: debts.length,
                availableAccounts: accounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  type: a.type,
                  provider: a.provider,
                  balance: a.balance,
                })),
              }}
            />
          )}

          {activeTab === 'receipt' && (
            <ReceiptScanner
              accounts={accounts}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsAndGoals
              budgets={budgets}
              goals={goals}
              transactions={transactions}
              accounts={accounts}
              onUpdateBudgets={handleUpdateBudgets}
              onUpdateGoals={handleUpdateGoals}
              onDeleteBudget={handleDeleteBudget}
              onDeleteGoal={handleDeleteGoal}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'salary' && (
            <SalaryCalculator
              accounts={accounts}
              isPrivacyMode={isPrivacyMode}
              onSaveSalaryToIncome={(salaryRes, targetAccId) => {
                const monthNames = [
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                const periodText = `${monthNames[salaryRes.input.periodMonth - 1]} ${salaryRes.input.periodYear}`;
                handleAddTransaction({
                  date: new Date().toISOString().split('T')[0],
                  title: `Gaji Karyawan (${salaryRes.input.employeeName || 'Saya'}) - ${periodText}`,
                  amount: salaryRes.netSalary,
                  type: 'income',
                  category: 'Gaji & Payroll',
                  subCategory: 'Gaji Bersih (THP)',
                  accountId: targetAccId,
                  paymentMethod: 'Transfer Payroll',
                  notes: `Gaji Bruto: ${formatRupiah(salaryRes.grossSalary)}, Potongan BPJS: ${formatRupiah(salaryRes.bpjs.totalEmployeeBpjs)}, PPh 21 TER: ${formatRupiah(salaryRes.pph21.monthlyPph21)}, Potongan Lain: ${formatRupiah(salaryRes.otherDeductionsTotal)}`,
                  tags: ['Gaji', 'Payroll', 'THP', periodText],
                  source: 'manual',
                  isVerified: true,
                });
                showToast(`Gaji sebesar ${formatRupiah(salaryRes.netSalary)} berhasil dicatat ke Kas Masuk!`);
              }}
            />
          )}
        </main>

        {/* Executive Footbar */}
        <footer className="hidden lg:block border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md py-3 text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200">ArthaSmart AI</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400">Sistem Manajemen Finansial Real-time Firestore</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-slate-400">Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">Ctrl+K</kbd> untuk pencarian cepat</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Command Palette Spotlight Search Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onOpenQuickScan={() => setActiveTab('receipt')}
        onSelectTransaction={(tx) => setSelectedTransactionDetail(tx)}
        accounts={accounts}
        transactions={transactions}
        debts={debts}
        goals={goals}
        budgets={budgets}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={handleTogglePrivacy}
      />

      {/* Android Mobile Native Bottom Navigation Bar */}
      <AndroidBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onOpenQuickScan={() => setActiveTab('receipt')}
      />

      {/* Android PWA / APK Install Modal Guide */}
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => {
          setIsNewTxModalOpen(false);
          setEditingTransaction(null);
          setNewTxDefaultDate(undefined);
        }}
        onSave={(tx) => {
          if (editingTransaction) {
            handleUpdateTransaction(tx);
          } else {
            handleAddTransaction(tx);
          }
        }}
        editTransaction={editingTransaction}
        accounts={accounts}
        defaultType={newTxDefaultType}
        defaultDate={newTxDefaultDate}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        transaction={selectedTransactionDetail}
        accounts={accounts}
        onClose={() => setSelectedTransactionDetail(null)}
        onEdit={(tx) => {
          setSelectedTransactionDetail(null);
          setEditingTransaction(tx);
          setIsNewTxModalOpen(true);
        }}
        onDelete={handleDeleteTransaction}
      />

      {/* Account Add / Edit Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
        onResetBalance={handleResetAccountBalance}
        onClearTransactions={handleClearAccountTransactions}
        editAccount={editingAccount}
        accountsCount={accounts.length}
      />

      {/* Global Reset Data Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Seluruh Data Keuangan?"
        message="Apakah Anda yakin ingin mengatur ulang seluruh data keuangan di cloud Firestore ke data contoh bawaan? Seluruh transaksi, rekening, dan catatan akan di-reset."
        confirmText="Ya, Reset Data Bawaan"
        cancelText="Batal"
        variant="danger"
        icon="alert"
        onConfirm={handleExecuteReset}
        onClose={() => setIsResetConfirmOpen(false)}
      />

      {/* Theme and Color Palette Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* User Authentication & Verified Email Modal */}
      <AuthModal />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl text-xs font-semibold shadow-xl border border-slate-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
