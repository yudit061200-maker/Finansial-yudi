import { Account, Budget, FinancialGoal, Transaction, ChatMessage } from '../types/finance';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
} from '../data/initialData';

const STORAGE_KEYS = {
  ACCOUNTS: 'arthasmart_accounts_v1',
  TRANSACTIONS: 'arthasmart_transactions_v1',
  BUDGETS: 'arthasmart_budgets_v1',
  GOALS: 'arthasmart_goals_v1',
  CHAT_HISTORY: 'arthasmart_chat_history_v1',
};

export const storage = {
  getAccounts(): Account[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  },
  saveAccounts(accounts: Account[]) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  },
  saveTransactions(transactions: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getBudgets(): Budget[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return data ? JSON.parse(data) : INITIAL_BUDGETS;
    } catch {
      return INITIAL_BUDGETS;
    }
  },
  saveBudgets(budgets: Budget[]) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  getGoals(): FinancialGoal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  },
  saveGoals(goals: FinancialGoal[]) {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  getChatHistory(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: 'Halo Yudit! 👋 Saya ArthaAI, asisten keuangan pribadimu.\nKamu bisa mengetik pengeluaran secara alami seperti:\n• *"Makan siang ayam geprek 25rb pakai QRIS BCA"*\n• *"Gaji masuk 15 juta ke Mandiri"*\n• *"Transfer 200rb ke OVO buat belanja"*\nAtau tanyakan apa pun tentang analisis keuanganmu!',
        timestamp: new Date().toISOString(),
      },
    ];
  },
  saveChatHistory(history: ChatMessage[]) {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  },

  resetAllToDefault() {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(INITIAL_BUDGETS));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  },
};
