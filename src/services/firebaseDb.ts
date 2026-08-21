import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Account,
  Transaction,
  Budget,
  FinancialGoal,
  ChatMessage,
  DebtRecord,
} from '../types/finance';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_DEBTS,
} from '../data/initialData';

// Firestore collection names
const COLLECTIONS = {
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budgets',
  GOALS: 'goals',
  DEBTS: 'debts',
  CHAT_MESSAGES: 'chat_messages',
  SYSTEM_META: 'system_meta',
};

const INIT_DOC_ID = 'init_status';
const LOCAL_SEEDED_KEY = 'arthasmart_seeded_v4';

/**
 * Recursively sanitizes data to remove `undefined` values and ensure
 * Firestore compatibility.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object' && data !== null) {
    // If it's a date or timestamp
    if (data instanceof Date) {
      return data.toISOString() as any;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Seed default initial data into Firestore ONLY ONCE when database is first created.
 * Uses both client localStorage and Firestore `system_meta/init_status` doc
 * to guarantee that deleted records NEVER get auto-restored.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // 1. Check local storage guard
    if (localStorage.getItem(LOCAL_SEEDED_KEY) === 'true') {
      return;
    }

    // 2. Check Firestore metadata
    const metaRef = doc(db, COLLECTIONS.SYSTEM_META, INIT_DOC_ID);
    const metaSnap = await getDoc(metaRef);

    if (metaSnap.exists() && metaSnap.data()?.isInitialized === true) {
      // Also ensure debts collection has initial items if empty
      const debtSnap = await getDocs(collection(db, COLLECTIONS.DEBTS));
      if (debtSnap.empty && INITIAL_DEBTS.length > 0) {
        const batch = writeBatch(db);
        INITIAL_DEBTS.forEach((d) => {
          const ref = doc(db, COLLECTIONS.DEBTS, d.id);
          batch.set(ref, d);
        });
        await batch.commit();
      }
      localStorage.setItem(LOCAL_SEEDED_KEY, 'true');
      return;
    }

    // 3. Check if user already has data in accounts or transactions
    const accSnap = await getDocs(collection(db, COLLECTIONS.ACCOUNTS));
    const txSnap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));

    if (!accSnap.empty || !txSnap.empty) {
      // Data already exists, seed debts if not present and mark initialized
      const debtSnap = await getDocs(collection(db, COLLECTIONS.DEBTS));
      if (debtSnap.empty && INITIAL_DEBTS.length > 0) {
        const batch = writeBatch(db);
        INITIAL_DEBTS.forEach((d) => {
          const ref = doc(db, COLLECTIONS.DEBTS, d.id);
          batch.set(ref, d);
        });
        await batch.commit();
      }
      await setDoc(metaRef, { isInitialized: true, updatedAt: new Date().toISOString() });
      localStorage.setItem(LOCAL_SEEDED_KEY, 'true');
      return;
    }

    console.log('🌱 First-time setup: Seeding initial demo data into Firestore...');
    const batch = writeBatch(db);

    INITIAL_ACCOUNTS.forEach((acc) => {
      const ref = doc(db, COLLECTIONS.ACCOUNTS, acc.id);
      batch.set(ref, acc);
    });

    INITIAL_TRANSACTIONS.forEach((tx) => {
      const ref = doc(db, COLLECTIONS.TRANSACTIONS, tx.id);
      batch.set(ref, tx);
    });

    INITIAL_BUDGETS.forEach((b) => {
      const ref = doc(db, COLLECTIONS.BUDGETS, b.id);
      batch.set(ref, b);
    });

    INITIAL_GOALS.forEach((g) => {
      const ref = doc(db, COLLECTIONS.GOALS, g.id);
      batch.set(ref, g);
    });

    INITIAL_DEBTS.forEach((d) => {
      const ref = doc(db, COLLECTIONS.DEBTS, d.id);
      batch.set(ref, d);
    });

    const welcomeMsg: ChatMessage = {
      id: 'msg-welcome',
      sender: 'ai',
      text: 'Halo! 👋 Data keuangan Anda tersimpan aman di cloud Firebase Firestore secara real-time.\n\nAnda bisa mencatat transaksi & hutang piutang seperti:\n• *"Makan siang Padang 28rb bayar QRIS BCA"*\n• *"Pinjamkan uang 500rb ke Budi jatuh tempo tgl 30"*\n• *"Saya berhutang 1jt ke Kredivo untuk beli monitor"*\n\nData akan langsung tersinkronisasi ke database cloud.',
      timestamp: new Date().toISOString(),
    };
    const chatRef = doc(db, COLLECTIONS.CHAT_MESSAGES, welcomeMsg.id);
    batch.set(chatRef, welcomeMsg);

    // Mark as initialized in cloud
    batch.set(metaRef, { isInitialized: true, createdAt: new Date().toISOString() });

    await batch.commit();
    localStorage.setItem(LOCAL_SEEDED_KEY, 'true');
    console.log('✅ Initial Firestore seeding completed.');
  } catch (error) {
    console.error('Error seeding Firestore:', error);
  }
}

// Subscriptions (Real-time listeners)
export function subscribeAccounts(onUpdate: (accounts: Account[]) => void) {
  const colRef = collection(db, COLLECTIONS.ACCOUNTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Account);
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore accounts subscription error:', error);
    }
  );
}

export function subscribeTransactions(onUpdate: (txs: Transaction[]) => void) {
  const colRef = collection(db, COLLECTIONS.TRANSACTIONS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Transaction);
      // Sort client-side by date descending
      items.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore transactions subscription error:', error);
    }
  );
}

export function subscribeBudgets(onUpdate: (budgets: Budget[]) => void) {
  const colRef = collection(db, COLLECTIONS.BUDGETS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Budget);
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore budgets subscription error:', error);
    }
  );
}

export function subscribeGoals(onUpdate: (goals: FinancialGoal[]) => void) {
  const colRef = collection(db, COLLECTIONS.GOALS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as FinancialGoal);
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore goals subscription error:', error);
    }
  );
}

export function subscribeDebts(onUpdate: (debts: DebtRecord[]) => void) {
  const colRef = collection(db, COLLECTIONS.DEBTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as DebtRecord);
      // Sort client-side: unpaid/partial first, then by dueDate or createdAt
      items.sort((a, b) => {
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dueA - dueB;
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore debts subscription error:', error);
    }
  );
}

export function subscribeChatHistory(onUpdate: (messages: ChatMessage[]) => void) {
  const colRef = collection(db, COLLECTIONS.CHAT_MESSAGES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as ChatMessage);
      items.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
      onUpdate(items);
    },
    (error) => {
      console.error('Firestore chat subscription error:', error);
    }
  );
}

// Account Mutations
export async function saveAccountToFirestore(account: Account): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACCOUNTS, account.id);
  await setDoc(ref, cleanForFirestore(account), { merge: true });
}

export async function updateAccountBalanceInFirestore(accountId: string, newBalance: number): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACCOUNTS, accountId);
  await setDoc(ref, { balance: newBalance }, { merge: true });
}

export async function deleteAccountFromFirestore(accountId: string, deleteLinkedTransactions = false): Promise<void> {
  const ref = doc(db, COLLECTIONS.ACCOUNTS, accountId);
  await deleteDoc(ref);

  if (deleteLinkedTransactions) {
    const txSnap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
    const batch = writeBatch(db);
    let count = 0;
    txSnap.docs.forEach((d) => {
      const data = d.data() as Transaction;
      if (data.accountId === accountId || data.destinationAccountId === accountId) {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  }
}

export async function deleteTransactionsByAccountId(accountId: string): Promise<number> {
  const txSnap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
  const batch = writeBatch(db);
  let count = 0;
  txSnap.docs.forEach((d) => {
    const data = d.data() as Transaction;
    if (data.accountId === accountId || data.destinationAccountId === accountId) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

// Transaction Mutations
export async function saveTransactionToFirestore(tx: Transaction): Promise<void> {
  const ref = doc(db, COLLECTIONS.TRANSACTIONS, tx.id);
  await setDoc(ref, cleanForFirestore(tx), { merge: true });
}

export async function saveMultipleTransactionsToFirestore(txs: Transaction[]): Promise<void> {
  const batch = writeBatch(db);
  txs.forEach((t) => {
    const ref = doc(db, COLLECTIONS.TRANSACTIONS, t.id);
    batch.set(ref, cleanForFirestore(t), { merge: true });
  });
  await batch.commit();
}

export async function deleteTransactionFromFirestore(txId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.TRANSACTIONS, txId);
  await deleteDoc(ref);
}

// Budget Mutations
export async function saveBudgetToFirestore(budget: Budget): Promise<void> {
  const ref = doc(db, COLLECTIONS.BUDGETS, budget.id);
  await setDoc(ref, cleanForFirestore(budget), { merge: true });
}

export async function deleteBudgetFromFirestore(budgetId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.BUDGETS, budgetId);
  await deleteDoc(ref);
}

export async function saveAllBudgetsToFirestore(budgets: Budget[]): Promise<void> {
  const existingSnap = await getDocs(collection(db, COLLECTIONS.BUDGETS));
  const newBudgetIds = new Set(budgets.map((b) => b.id));

  const batch = writeBatch(db);
  existingSnap.docs.forEach((d) => {
    if (!newBudgetIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  budgets.forEach((b) => {
    const ref = doc(db, COLLECTIONS.BUDGETS, b.id);
    batch.set(ref, cleanForFirestore(b), { merge: true });
  });

  await batch.commit();
}

// Goal Mutations
export async function saveGoalToFirestore(goal: FinancialGoal): Promise<void> {
  const ref = doc(db, COLLECTIONS.GOALS, goal.id);
  await setDoc(ref, cleanForFirestore(goal), { merge: true });
}

export async function deleteGoalFromFirestore(goalId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.GOALS, goalId);
  await deleteDoc(ref);
}

export async function saveAllGoalsToFirestore(goals: FinancialGoal[]): Promise<void> {
  const existingSnap = await getDocs(collection(db, COLLECTIONS.GOALS));
  const newGoalIds = new Set(goals.map((g) => g.id));

  const batch = writeBatch(db);
  existingSnap.docs.forEach((d) => {
    if (!newGoalIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  goals.forEach((g) => {
    const ref = doc(db, COLLECTIONS.GOALS, g.id);
    batch.set(ref, cleanForFirestore(g), { merge: true });
  });

  await batch.commit();
}

// Debt & Receivable Mutations
export async function saveDebtToFirestore(debt: DebtRecord): Promise<void> {
  const ref = doc(db, COLLECTIONS.DEBTS, debt.id);
  await setDoc(ref, cleanForFirestore(debt), { merge: true });
}

export async function deleteDebtFromFirestore(debtId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.DEBTS, debtId);
  await deleteDoc(ref);
}

export async function saveAllDebtsToFirestore(debts: DebtRecord[]): Promise<void> {
  const existingSnap = await getDocs(collection(db, COLLECTIONS.DEBTS));
  const newDebtIds = new Set(debts.map((d) => d.id));

  const batch = writeBatch(db);
  existingSnap.docs.forEach((d) => {
    if (!newDebtIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  debts.forEach((d) => {
    const ref = doc(db, COLLECTIONS.DEBTS, d.id);
    batch.set(ref, cleanForFirestore(d), { merge: true });
  });

  await batch.commit();
}

// Chat Message Mutations
export async function addChatMessageToFirestore(msg: ChatMessage): Promise<void> {
  const ref = doc(db, COLLECTIONS.CHAT_MESSAGES, msg.id);
  await setDoc(ref, cleanForFirestore(msg), { merge: true });
}

export async function clearChatHistoryInFirestore(): Promise<void> {
  const snap = await getDocs(collection(db, COLLECTIONS.CHAT_MESSAGES));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// Reset everything in Firestore to standard initial data
export async function resetAllFirestoreData(): Promise<void> {
  const collectionsToClear = [
    COLLECTIONS.ACCOUNTS,
    COLLECTIONS.TRANSACTIONS,
    COLLECTIONS.BUDGETS,
    COLLECTIONS.GOALS,
    COLLECTIONS.DEBTS,
    COLLECTIONS.CHAT_MESSAGES,
    COLLECTIONS.SYSTEM_META,
  ];

  for (const colName of collectionsToClear) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  localStorage.removeItem(LOCAL_SEEDED_KEY);

  // Re-seed defaults
  await seedFirestoreIfEmpty();
}
