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
