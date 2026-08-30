export function formatRupiah(amount: number, withSymbol: boolean = true): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID').format(absVal);
  if (!withSymbol) return isNegative ? `-${formatted}` : formatted;
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatRupiahShort(amount: number): string {
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

/**
 * Menghasilkan informasi lengkap status jatuh tempo terdekat (countdown, label, badge)
 */
export function getNearestDueInfo(
  dueDayOfMonth?: number,
  explicitDueDate?: string,
  status?: string
) {
  let targetDateStr = explicitDueDate;

  // Jika ada dueDayOfMonth dan status belum lunas, sesuaikan ke tanggal jatuh tempo terdekat
  if (dueDayOfMonth && status !== 'paid') {
    targetDateStr = calculateNearestDueDate(dueDayOfMonth);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold',
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
