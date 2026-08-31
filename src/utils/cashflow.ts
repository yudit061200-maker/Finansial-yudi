import { Transaction, DebtRecord } from '../types/finance';

export interface RunningBalanceItem {
  transactionId: string;
  runningBalance: number;
  cumulativeIncome: number;
  cumulativeExpense: number;
}

export interface CashSummary {
  initialBalance: number; // Saldo kas awal (bawaan: 0)
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  currentSisaKas: number; // Sisa kas terkini
  lastTransactionSisaKas: number; // Sisa kas transaksi terakhir
  lastTransactionDate?: string;
  totalTransactionsCount: number;
  isEmpty: boolean;
}

/**
 * Menghitung saldo kas berjalan (running balance) secara kronologis dari awal (Rp 0).
 * Setiap pemasukan (+) menambah kas, dan setiap pengeluaran / cicilan (-) mengurangi kas.
 * Mengembalikan Map ID transaksi -> running balance untuk lookup cepat O(1).
 */
export function computeRunningBalances(
  transactions: Transaction[],
  initialBalance: number = 0
): {
  balanceMap: Map<string, number>;
  latestBalance: number;
  cumulativeIncomeMap: Map<string, number>;
  cumulativeExpenseMap: Map<string, number>;
} {
  const balanceMap = new Map<string, number>();
  const cumulativeIncomeMap = new Map<string, number>();
  const cumulativeExpenseMap = new Map<string, number>();

  if (!transactions || transactions.length === 0) {
    return {
      balanceMap,
      latestBalance: initialBalance,
      cumulativeIncomeMap,
      cumulativeExpenseMap,
    };
  }

  // Urutkan secara kronologis (dari terlama ke terbaru)
  const sorted = [...transactions].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  let currentBalance = initialBalance;
  let cumIncome = 0;
  let cumExpense = 0;

  for (const tx of sorted) {
    if (tx.type === 'income') {
      currentBalance += tx.amount;
      cumIncome += tx.amount;
    } else if (tx.type === 'expense') {
      currentBalance -= tx.amount;
      cumExpense += tx.amount;
    }
    // Catatan: type 'transfer' antar akun pribadi tidak mengubah total sisa kas gabungan

    balanceMap.set(tx.id, currentBalance);
    cumulativeIncomeMap.set(tx.id, cumIncome);
    cumulativeExpenseMap.set(tx.id, cumExpense);
  }

  return {
    balanceMap,
    latestBalance: currentBalance,
    cumulativeIncomeMap,
    cumulativeExpenseMap,
  };
}

/**
 * Menghitung ringkasan sisa kas menyeluruh.
 * Apabila transaksi kosong, maka sisa kas bernilai 0 atau mengikuti sisa kas transaksi terakhir jika tersedia.
 */
export function getCashSummary(
  allTransactions: Transaction[],
  initialBalance: number = 0
): CashSummary {
  if (!allTransactions || allTransactions.length === 0) {
    return {
      initialBalance,
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      currentSisaKas: initialBalance,
      lastTransactionSisaKas: initialBalance,
      totalTransactionsCount: 0,
      isEmpty: true,
    };
  }

  const { latestBalance } = computeRunningBalances(allTransactions, initialBalance);

  let totalIncome = 0;
  let totalExpense = 0;

  // Cari transaksi terbaru
  let latestTx: Transaction | null = null;
  let latestTime = -Infinity;

  for (const tx of allTransactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }

    const t = new Date(tx.date).getTime();
    if (t > latestTime) {
      latestTime = t;
      latestTx = tx;
    }
  }

  const currentSisaKas = initialBalance + totalIncome - totalExpense;

  return {
    initialBalance,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    currentSisaKas,
    lastTransactionSisaKas: latestBalance,
    lastTransactionDate: latestTx ? latestTx.date : undefined,
    totalTransactionsCount: allTransactions.length,
    isEmpty: false,
  };
}
