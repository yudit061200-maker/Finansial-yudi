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

// Hutang, Piutang & Kredit / Cicilan Barang Types
export type DebtType = 'payable' | 'receivable' | 'installment'; // payable = Hutang Pinjaman, receivable = Piutang, installment = Kredit / Cicilan Barang
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface DebtPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  accountId?: string;
  notes?: string;
  transactionId?: string;
  monthNumber?: number; // Cicilan Bulan Ke- (misal: Bulan ke-1, Bulan ke-2, dst.)
}

export interface DebtRecord {
  id: string;
  type: DebtType;
  personName: string; // Pihak Terkait / Lembaga / Toko (Kredivo, SpayLater, Bank BCA, dll.)
  contactPhone?: string; // WhatsApp / Phone
  title: string; // Keperluan / Nama Barang (misal: Cicilan iPhone 15, Honda Vario 160)
  totalAmount: number; // Jumlah Total Kewajiban (Pokok + Bunga / Total Harga Kredit)
  paidAmount: number; // Jumlah yang Sudah Dibayar (Rp)
  remainingAmount: number; // Sisa yang Belum Dibayar (Rp)
  dueDate?: string; // Jatuh tempo terdekat / akhir
  startDate: string; // Tanggal Mulai / Pembelian
  status: DebtStatus; // 'unpaid' | 'partial' | 'paid'
  notes?: string;
  category?: string; // e.g. "Kredit Gadget & Elektronik", "Cicilan Kendaraan", "PayLater", dll.
  payments: DebtPayment[];
  createdAt: string;

  // Fitur Khusus Kredit & Cicilan Barang
  isInstallment?: boolean;
  itemName?: string; // Nama barang yang dikredit
  providerName?: string; // Penyedia cicilan (Kredivo, SpayLater, Akulaku, BCA Cicilan, dll.)
  originalPrice?: number; // Harga Cash Asli Barang
  downPayment?: number; // Uang Muka / DP yang sudah dibayar di awal
  tenorMonths?: number; // Total Tenor dalam Bulan (misal: 3, 6, 12, 24, 36 bulan)
  paidMonths?: number; // Berapa bulan angsuran yang SUDAH DIBAYAR (misal: 4 dari 12 bulan)
  monthlyInstallment?: number; // Nominal Angsuran Pokok + Bunga per Bulan (Rp)
  interestRatePercent?: number; // Suku Bunga per Bulan (%) atau per Tahun
  adminFee?: number; // Biaya Admin / Layanan Bulanan
  dueDayOfMonth?: number; // Tanggal Jatuh Tempo Setiap Bulan (misal: tanggal 5 atau 25)
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
