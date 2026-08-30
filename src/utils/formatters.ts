export function formatRupiah(amount: number, withSymbol: boolean = true): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID').format(absVal);
  if (!withSymbol) return isNegative ? `-${formatted}` : formatted;
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatRupiahShort(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  let formatted = '';

  if (abs >= 1_000_000_000) {
    formatted = `${(abs / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M`;
  } else if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} Jt`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(0)} Rb`;
  } else {
    formatted = `${abs}`;
  }

  return (isNegative ? '-Rp ' : 'Rp ') + formatted;
}

export function formatDateIndo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Hari ini';
    if (isYesterday) return 'Kemarin';

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Menghitung tanggal jatuh tempo terdekat (nearest upcoming due date)
 * berdasarkan dueDayOfMonth (1-31).
 * Contoh: Jika hari ini 30 Agustus dan jatuh tempo tgl 5,
 * maka jatuh tempo terdekat adalah 5 September.
 */
export function calculateNearestDueDate(
  dueDayOfMonth?: number,
  baseDate: Date = new Date()
): string {
  if (!dueDayOfMonth || dueDayOfMonth < 1 || dueDayOfMonth > 31) {
    const y = baseDate.getFullYear();
    const m = (baseDate.getMonth() + 1).toString().padStart(2, '0');
    const d = baseDate.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const curY = today.getFullYear();
  const curM = today.getMonth();

  // 1. Cek tanggal jatuh tempo di bulan berjalan
  const maxDaysThisMonth = new Date(curY, curM + 1, 0).getDate();
  const validDayThisMonth = Math.min(dueDayOfMonth, maxDaysThisMonth);
  const thisMonthDue = new Date(curY, curM, validDayThisMonth);

  // Jika tanggal jatuh tempo di bulan ini masih hari ini atau masa depan, gunakan bulan ini
  if (thisMonthDue >= today) {
    const yStr = thisMonthDue.getFullYear();
    const mStr = (thisMonthDue.getMonth() + 1).toString().padStart(2, '0');
    const dStr = thisMonthDue.getDate().toString().padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  }

  // 2. Jika tanggal jatuh tempo bulan ini sudah lewat, maka jatuh tempo terdekat adalah di bulan depan
  const nextM = curM + 1;
  const nextY = curY + Math.floor(nextM / 12);
  const normNextM = ((nextM % 12) + 12) % 12;
  const maxDaysNextMonth = new Date(nextY, normNextM + 1, 0).getDate();
  const validDayNextMonth = Math.min(dueDayOfMonth, maxDaysNextMonth);
  const nextMonthDue = new Date(nextY, normNextM, validDayNextMonth);

  const yStr = nextMonthDue.getFullYear();
  const mStr = (normNextM + 1).toString().padStart(2, '0');
  const dStr = nextMonthDue.getDate().toString().padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

export interface LateFeeCalculationResult {
  isOverdue: boolean;
  daysOverdue: number;
  gracePeriodDays: number;
  effectiveLateDays: number;
  penaltyAmount: number;
  accumulatedLateFee: number;
  waivedLateFee: number;
  totalLateFeePayable: number;
  monthlyInstallment: number;
  baseAmountDue: number;
  totalAmountDueWithPenalty: number;
  dueDateStr: string;
  dueDateFormatted: string;
  lateFeeDescription: string;
  ruleLabel: string;
  formulaExplanation?: string;
  calculatedFee?: number;
  totalWithLateFee?: number;
}

/**
 * Memeriksa apakah suatu catatan hutang/kredit telah lunas seutuhnya.
 * Mengembalikan true jika:
 * 1. status === 'paid'
 * 2. remainingAmount <= 0 (dan totalAmount > 0)
 * 3. paidAmount >= totalAmount (dan totalAmount > 0)
 * 4. Untuk cicilan: paidMonths >= tenorMonths (dan tenorMonths > 0)
 */
export function isDebtPaid(debt?: {
  status?: string;
  remainingAmount?: number;
  paidAmount?: number;
  totalAmount?: number;
  tenorMonths?: number;
  paidMonths?: number;
  isInstallment?: boolean;
  type?: string;
} | null): boolean {
  if (!debt) return false;
  if (debt.status === 'paid') return true;
  if (debt.remainingAmount !== undefined && debt.remainingAmount <= 0 && (debt.totalAmount || 0) > 0) return true;
  if (debt.paidAmount !== undefined && debt.totalAmount !== undefined && debt.totalAmount > 0 && debt.paidAmount >= debt.totalAmount) return true;
  const isInst = debt.type === 'installment' || debt.isInstallment;
  if (isInst && debt.tenorMonths && debt.tenorMonths > 0 && (debt.paidMonths || 0) >= debt.tenorMonths) return true;
  return false;
}

export const LATE_FEE_PRESETS = [
  {
    id: 'spaylater',
    name: 'Shopee PayLater (5% per bulan)',
    provider: 'SpayLater',
    type: 'monthly_percent' as const,
    value: 5,
    gracePeriod: 0,
    description: 'Denda keterlambatan 5% dari total tagihan bulanan per bulan terlambat',
  },
  {
    id: 'kredivo',
    name: 'Kredivo / Akulaku (0.2% per hari)',
    provider: 'Kredivo / Akulaku',
    type: 'daily_percent' as const,
    value: 0.2,
    gracePeriod: 0,
    description: 'Bunga denda 0.2% per hari kalender keterlambatan (sekitar 6%/bulan)',
  },
  {
    id: 'leasing_motor',
    name: 'Leasing Motor FIF/BAF (Rp 5.000/hari)',
    provider: 'Leasing Kendaraan',
    type: 'daily_fixed' as const,
    value: 5000,
    gracePeriod: 3,
    description: 'Denda harian Rp 5.000 per hari setelah masa tenggang 3 hari',
  },
  {
    id: 'bank_card',
    name: 'Kartu Kredit Bank (1% flat per bulan)',
    provider: 'Bank BCA / Mandiri / BNI',
    type: 'monthly_percent' as const,
    value: 1,
    gracePeriod: 0,
    description: 'Denda 1% dari total tagihan jatuh tempo',
  },
  {
    id: 'flat_nominal',
    name: 'Denda Flat Rp 50.000 per Bulan',
    provider: 'Lainnya',
    type: 'monthly_fixed' as const,
    value: 50000,
    gracePeriod: 0,
    description: 'Biaya keterlambatan tetap Rp 50.000 per bulan',
  },
];

/**
 * Menghitung denda keterlambatan dan status keterlambatan untuk kredit/hutang
 */
export function calculateLateFeeAndOverdue(
  debt: {
    status?: string;
    type?: string;
    isInstallment?: boolean;
    dueDate?: string;
    dueDayOfMonth?: number;
    startDate?: string;
    monthlyInstallment?: number;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
    tenorMonths?: number;
    paidMonths?: number;
    hasLateFeeRule?: boolean;
    lateFeeType?: 'daily_fixed' | 'daily_percent' | 'monthly_percent' | 'monthly_fixed';
    lateFeeValue?: number;
    gracePeriodDays?: number;
    accumulatedLateFee?: number;
    waivedLateFee?: number;
  },
  asOfDate: Date = new Date()
): LateFeeCalculationResult {
  const isPaid = isDebtPaid(debt);
  const monthlyInst = debt.monthlyInstallment || (debt.remainingAmount || 0);
  const baseDue = monthlyInst > 0 ? Math.min(monthlyInst, debt.remainingAmount || monthlyInst) : (debt.remainingAmount || 0);

  if (isPaid || (debt.remainingAmount !== undefined && debt.remainingAmount <= 0 && (debt.totalAmount || 0) > 0)) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      gracePeriodDays: 0,
      effectiveLateDays: 0,
      penaltyAmount: 0,
      accumulatedLateFee: 0,
      waivedLateFee: debt.waivedLateFee || 0,
      totalLateFeePayable: 0,
      monthlyInstallment: monthlyInst,
      baseAmountDue: 0,
      totalAmountDueWithPenalty: 0,
      dueDateStr: debt.dueDate || '',
      dueDateFormatted: debt.dueDate ? formatDateIndo(debt.dueDate) : 'Lunas',
      lateFeeDescription: 'Tagihan telah lunas.',
      ruleLabel: 'Lunas',
    };
  }

  // Tentukan tanggal jatuh tempo aktif
  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  let targetDueDate: Date | null = null;
  let targetDueDateStr = debt.dueDate || '';

  const isInst = debt.type === 'installment' || debt.isInstallment;

  if (debt.dueDate) {
    targetDueDate = new Date(debt.dueDate + 'T00:00:00');
    targetDueDateStr = debt.dueDate;
  } else if (isInst && debt.startDate && debt.paidMonths !== undefined) {
    // Hitung jatuh tempo untuk angsuran berikutnya yang belum dibayar
    const nextUnpaidIdx = debt.paidMonths; // 0-indexed offset
    const startD = new Date(debt.startDate + 'T00:00:00');
    const curY = startD.getFullYear();
    const curM = startD.getMonth() + nextUnpaidIdx;
    const targetY = curY + Math.floor(curM / 12);
    const targetM = ((curM % 12) + 12) % 12;
    const maxDays = new Date(targetY, targetM + 1, 0).getDate();
    const validDay = Math.min(debt.dueDayOfMonth || startD.getDate() || 5, maxDays);
    targetDueDate = new Date(targetY, targetM, validDay);
    const yStr = targetDueDate.getFullYear();
    const mStr = (targetDueDate.getMonth() + 1).toString().padStart(2, '0');
    const dStr = targetDueDate.getDate().toString().padStart(2, '0');
    targetDueDateStr = `${yStr}-${mStr}-${dStr}`;
  } else if (debt.dueDayOfMonth) {
    targetDueDateStr = calculateNearestDueDate(debt.dueDayOfMonth, today);
    targetDueDate = new Date(targetDueDateStr + 'T00:00:00');
  }

  if (!targetDueDate || isNaN(targetDueDate.getTime())) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      gracePeriodDays: 0,
      effectiveLateDays: 0,
      penaltyAmount: 0,
      accumulatedLateFee: debt.accumulatedLateFee || 0,
      waivedLateFee: debt.waivedLateFee || 0,
      totalLateFeePayable: Math.max(0, (debt.accumulatedLateFee || 0) - (debt.waivedLateFee || 0)),
      monthlyInstallment: monthlyInst,
      baseAmountDue: baseDue,
      totalAmountDueWithPenalty: baseDue + Math.max(0, (debt.accumulatedLateFee || 0) - (debt.waivedLateFee || 0)),
      dueDateStr: '',
      dueDateFormatted: 'Belum ditentukan',
      lateFeeDescription: 'Tanpa tanggal jatuh tempo',
      ruleLabel: 'Standar',
    };
  }

  const diffTime = today.getTime() - targetDueDate.getTime();
  const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = daysDiff > 0;
  const daysOverdue = isOverdue ? daysDiff : 0;
  const gracePeriodDays = debt.gracePeriodDays || 0;
  const effectiveLateDays = Math.max(0, daysOverdue - gracePeriodDays);

  // Aturan denda
  const hasRule = debt.hasLateFeeRule ?? true; // Default true jika ada keterlambatan
  const lateFeeType = debt.lateFeeType || 'daily_fixed';
  const lateFeeValue = debt.lateFeeValue !== undefined ? debt.lateFeeValue : 5000;

  let calculatedPenalty = 0;
  let ruleLabel = '';

  if (isOverdue && effectiveLateDays > 0 && hasRule) {
    switch (lateFeeType) {
      case 'daily_fixed':
        calculatedPenalty = effectiveLateDays * lateFeeValue;
        ruleLabel = `Rp ${formatRupiah(lateFeeValue, false)}/hari`;
        break;
      case 'daily_percent':
        calculatedPenalty = effectiveLateDays * (baseDue * (lateFeeValue / 100));
        ruleLabel = `${lateFeeValue}%/hari`;
        break;
      case 'monthly_percent':
        const monthsLate = Math.ceil(effectiveLateDays / 30);
        calculatedPenalty = monthsLate * (baseDue * (lateFeeValue / 100));
        ruleLabel = `${lateFeeValue}%/bln`;
        break;
      case 'monthly_fixed':
        const mCount = Math.ceil(effectiveLateDays / 30);
        calculatedPenalty = mCount * lateFeeValue;
        ruleLabel = `Rp ${formatRupiah(lateFeeValue, false)}/bln`;
        break;
      default:
        calculatedPenalty = effectiveLateDays * 5000;
        ruleLabel = 'Rp 5.000/hari';
    }
  } else if (!hasRule) {
    calculatedPenalty = 0;
    ruleLabel = 'Tanpa Denda';
  } else {
    ruleLabel = lateFeeType === 'daily_fixed'
      ? `Rp ${formatRupiah(lateFeeValue, false)}/hari`
      : lateFeeType === 'daily_percent'
      ? `${lateFeeValue}%/hari`
      : lateFeeType === 'monthly_percent'
      ? `${lateFeeValue}%/bln`
      : `Rp ${formatRupiah(lateFeeValue, false)}/bln`;
  }

  const penaltyAmount = Math.round(calculatedPenalty);
  const accumulatedLateFee = debt.accumulatedLateFee || 0;
  const waivedLateFee = debt.waivedLateFee || 0;
  const totalLateFeePayable = Math.max(0, penaltyAmount + accumulatedLateFee - waivedLateFee);
  const totalAmountDueWithPenalty = baseDue + totalLateFeePayable;

  let lateFeeDescription = '';
  if (!isOverdue) {
    lateFeeDescription = 'Status pembayaran lancar (belum jatuh tempo).';
  } else if (daysOverdue <= gracePeriodDays) {
    lateFeeDescription = `Terlambat ${daysOverdue} hari, masih dalam masa tenggang (${gracePeriodDays} hari bebas denda).`;
  } else {
    lateFeeDescription = `Terlambat ${daysOverdue} hari (${effectiveLateDays} hari dikenakan denda @ ${ruleLabel}). Total denda: Rp ${formatRupiah(totalLateFeePayable, false)}.`;
  }

  return {
    isOverdue,
    daysOverdue,
    gracePeriodDays,
    effectiveLateDays,
    penaltyAmount,
    accumulatedLateFee,
    waivedLateFee,
    totalLateFeePayable,
    monthlyInstallment: monthlyInst,
    baseAmountDue: baseDue,
    totalAmountDueWithPenalty,
    dueDateStr: targetDueDateStr,
    dueDateFormatted: formatDateIndo(targetDueDateStr),
    lateFeeDescription,
    ruleLabel,
    formulaExplanation: lateFeeDescription,
    calculatedFee: totalLateFeePayable,
    totalWithLateFee: totalAmountDueWithPenalty,
  };
}

/**
 * Menghasilkan informasi lengkap status jatuh tempo terdekat (countdown, label, badge)
 */
export function getNearestDueInfo(
  dueDayOfMonth?: number,
  explicitDueDate?: string,
  status?: string,
  debt?: any
) {
  const isPaid = status === 'paid' || isDebtPaid(debt);

  if (isPaid) {
    return {
      dueDateStr: explicitDueDate || '',
      formattedDate: explicitDueDate ? formatDateIndo(explicitDueDate) : 'Sudah Lunas',
      daysRemaining: 0,
      statusLabel: 'Sudah Lunas',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      statusType: 'paid' as const,
    };
  }

  let targetDateStr = explicitDueDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Jika ada dueDayOfMonth dan belum ada explicitDueDate
  if (dueDayOfMonth && !targetDateStr) {
    targetDateStr = calculateNearestDueDate(dueDayOfMonth, today);
  }

  if (!targetDateStr) {
    return {
      dueDateStr: '',
      formattedDate: '-',
      daysRemaining: 0,
      statusLabel: 'Tidak ada tanggal',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      statusType: 'none' as const,
    };
  }

  const targetDate = new Date(targetDateStr + 'T00:00:00');
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (status === 'paid') {
    return {
      dueDateStr: targetDateStr,
      formattedDate: formatDateIndo(targetDateStr),
      daysRemaining: 0,
      statusLabel: 'Sudah Lunas',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      statusType: 'paid' as const,
    };
  }

  if (diffDays === 0) {
    return {
      dueDateStr: targetDateStr,
      formattedDate: formatDateIndo(targetDateStr),
      daysRemaining: 0,
      statusLabel: 'Jatuh Tempo Hari Ini',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse font-bold',
      statusType: 'today' as const,
    };
  }

  if (diffDays < 0) {
    return {
      dueDateStr: targetDateStr,
      formattedDate: formatDateIndo(targetDateStr),
      daysRemaining: diffDays,
      statusLabel: `Lewat ${Math.abs(diffDays)} Hari`,
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold animate-pulse',
      statusType: 'overdue' as const,
    };
  }

  if (diffDays === 1) {
    return {
      dueDateStr: targetDateStr,
      formattedDate: formatDateIndo(targetDateStr),
      daysRemaining: 1,
      statusLabel: 'Besok',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold',
      statusType: 'tomorrow' as const,
    };
  }

  return {
    dueDateStr: targetDateStr,
    formattedDate: formatDateIndo(targetDateStr),
    daysRemaining: diffDays,
    statusLabel: `${diffDays} Hari Lagi`,
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    statusType: 'upcoming' as const,
  };
}

export const DEFAULT_CATEGORIES = {
  expense: [
    { name: 'Makanan & Minuman', icon: 'Utensils', color: '#F97316' },
    { name: 'Belanja & Groceries', icon: 'ShoppingCart', color: '#3B82F6' },
    { name: 'Transportasi', icon: 'Car', color: '#6366F1' },
    { name: 'Tagihan & Utilitas', icon: 'Receipt', color: '#EF4444' },
    { name: 'Hiburan & Rekreasi', icon: 'Film', color: '#8B5CF6' },
    { name: 'Kesehatan & Farmasi', icon: 'HeartPulse', color: '#EC4899' },
    { name: 'Kebutuhan Rumah', icon: 'Home', color: '#10B981' },
    { name: 'Pendidikan & Kerja', icon: 'GraduationCap', color: '#06B6D4' },
    { name: 'Investasi & Tabungan', icon: 'TrendingUp', color: '#14B8A6' },
    { name: 'Lain-lain', icon: 'MoreHorizontal', color: '#64748B' },
  ],
  income: [
    { name: 'Gaji & Pendapatan', icon: 'Briefcase', color: '#10B981' },
    { name: 'Bisnis & Sampingan', icon: 'Store', color: '#06B6D4' },
    { name: 'Investasi & Dividen', icon: 'LineChart', color: '#8B5CF6' },
    { name: 'Hadiah & Bonus', icon: 'Gift', color: '#F59E0B' },
    { name: 'Pemasukan Lainnya', icon: 'PlusCircle', color: '#64748B' },
  ],
  transfer: [
    { name: 'Transfer Antar Rekening', icon: 'ArrowRightLeft', color: '#6366F1' },
    { name: 'Top Up E-Wallet', icon: 'Smartphone', color: '#3B82F6' },
    { name: 'Tarik Tunai', icon: 'Banknote', color: '#10B981' },
  ],
};
