export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'bank' | 'ewallet' | 'cash' | 'investment' | 'credit_card';

export type BankProvider =
  | 'bca'
  | 'mandiri'
  | 'bri'
  | 'bni'
  | 'cimb'
  | 'jenius'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'bibit'
  | 'cash'
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  provider: BankProvider;
  accountNumberMasked: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  accountHolder?: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or ISO string
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string;
  accountId: string;
  destinationAccountId?: string; // For transfers
  paymentMethod?: string;
  notes?: string;
  tags?: string[];
  source: 'manual' | 'ai_chat' | 'receipt_scan';
  receiptImage?: string;
  receiptItems?: ReceiptItem[];
  isVerified?: boolean;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number; // e.g. 0.8 for 80%
  color: string;
  icon: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  monthlyContributionTarget: number;
  color: string;
  icon: string;
  isCompleted?: boolean;
}

// Hutang & Piutang Types
export type DebtType = 'payable' | 'receivable'; // payable = Hutang (Saya berhutang), receivable = Piutang (Orang berhutang ke saya)
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface DebtPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  accountId?: string;
  notes?: string;
  transactionId?: string;
}

export interface DebtRecord {
  id: string;
  type: DebtType;
  personName: string; // Pihak Terkait (Teman / Lembaga / Bank)
  contactPhone?: string; // WhatsApp / Phone
  title: string; // Keperluan / Keterangan
  totalAmount: number; // Jumlah Total
  paidAmount: number; // Jumlah yang Sudah Dibayar
  remainingAmount: number; // Sisa
  dueDate?: string; // Jatuh tempo
  startDate: string; // Tanggal Mulai
  status: DebtStatus; // 'unpaid' | 'partial' | 'paid'
  notes?: string;
  category?: string;
  payments: DebtPayment[];
  createdAt: string;
}

export interface ParsedReceiptData {
  merchant: string;
  date: string;
  time?: string;
  receiptNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    category?: string;
  }>;
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  suggestedCategory: string;
  confidence?: number;
  notes?: string;
  rawImage?: string;
}

export interface ParsedChatResult {
  action: string;
  aiReply: string;
  transactions?: Array<{
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    accountName: string;
    destinationAccountName?: string;
    date: string;
    notes?: string;
    tags?: string[];
  }>;
  debt?: {
    type: DebtType;
    personName: string;
    title: string;
    amount: number;
    dueDate?: string;
    notes?: string;
  };
  financialInsight?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  parsedTransactions?: Array<{
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    accountName: string;
    destinationAccountName?: string;
    date: string;
    notes?: string;
    tags?: string[];
  }>;
  parsedDebt?: {
    type: DebtType;
    personName: string;
    title: string;
    amount: number;
    dueDate?: string;
    notes?: string;
  };
  financialInsight?: string;
  isSaved?: boolean;
}

export interface FinancialHealthScore {
  score: number;
  status: string;
  savingsRate: number;
  emergencyFundMonths: number;
  budgetAdherence: number;
  insights: string[];
}
