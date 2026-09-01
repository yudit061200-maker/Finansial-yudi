import {
  WorkScheduleDay,
  WorkStatus,
  CompanySalaryProfile,
  DayCompanyAssignment,
} from '../types/salary';

/**
 * Daftar Hari Libur Nasional Indonesia Umum (Reference Data)
 */
export const INDONESIAN_HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-20': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-20': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-22': 'Cuti Bersama Idul Fitri',
  '2026-04-03': 'Wafat Isa Almasih (Jumat Agung)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Isa Almasih',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-07': 'Hari Raya Idul Adha 1447 H',
  '2026-06-27': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Hari Kemerdekaan RI Ke-81',
  '2026-09-04': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
};

/**
 * Menghitung Rentang Tanggal Periode Cut-Off (Tutup Penghitungan)
 * Misal cutOffDay = 20, periodMonth = 8, periodYear = 2026:
 * Start: 2026-07-21, End: 2026-08-20
 * Misal cutOffDay = 31 (akhir bulan):
 * Start: 2026-08-01, End: 2026-08-31
 */
export function getCutOffDateRange(
  periodYear: number,
  periodMonth: number, // 1 - 12
  cutOffDay: number // 1 - 31
): {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startDisplay: string;
  endDisplay: string;
  totalDays: number;
  dateList: string[]; // List string YYYY-MM-DD
} {
  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  // Jika cutOffDay >= 28 dan dianggap akhir bulan atau 31
  const daysInCurrentMonth = new Date(periodYear, periodMonth, 0).getDate();
  const effectiveCutOffDay = Math.min(cutOffDay, daysInCurrentMonth);

  let startDateObj: Date;
  let endDateObj: Date;

  if (cutOffDay >= 31 || cutOffDay >= daysInCurrentMonth) {
    // Mode Kalender Penuh: 1 s.d Akhir Bulan ini
    startDateObj = new Date(periodYear, periodMonth - 1, 1);
    endDateObj = new Date(periodYear, periodMonth - 1, daysInCurrentMonth);
  } else {
    // Mode Cut-Off tanggal N:
    // Mulai tanggal (N + 1) bulan sebelumnya s.d tanggal N bulan ini
    let prevMonth = periodMonth - 1;
    let prevYear = periodYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = periodYear - 1;
    }
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const startDay = Math.min(effectiveCutOffDay + 1, daysInPrevMonth);

    startDateObj = new Date(prevYear, prevMonth - 1, startDay);
    endDateObj = new Date(periodYear, periodMonth - 1, effectiveCutOffDay);
  }

  // Generate list of dates
  const dateList: string[] = [];
  const curr = new Date(startDateObj);
  while (curr <= endDateObj) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dateList.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startDisplay = `${startDateObj.getDate()} ${monthNamesShort[startDateObj.getMonth()]} ${startDateObj.getFullYear()}`;
  const endDisplay = `${endDateObj.getDate()} ${monthNamesShort[endDateObj.getMonth()]} ${endDateObj.getFullYear()}`;

  return {
    startDate: formatIso(startDateObj),
    endDate: formatIso(endDateObj),
    startDisplay,
    endDisplay,
    totalDays: dateList.length,
    dateList,
  };
}

/**
 * Generate Hari Kalender Lengkap untuk suatu Bulan (atau Mode Cut-Off)
 */
export function generateMonthScheduleDays(
  year: number,
  month: number,
  existingSchedules: Record<string, WorkScheduleDay> = {},
  defaultCompanyAId = 'company_a',
  defaultCompanyBId = 'company_b'
): WorkScheduleDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const scheduleDays: WorkScheduleDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 (Minggu) - 6 (Sabtu)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (existingSchedules[dateStr]) {
      scheduleDays.push(existingSchedules[dateStr]);
      continue;
    }

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = INDONESIAN_HOLIDAYS[dateStr];
    const isHoliday = !!holidayName;

    // Default status:
    // PT A: Senin - Jumat Masuk (work), Sabtu-Minggu Libur (off)
    // PT B: Shift / Harian di Sabtu-Minggu atau Fleksibel
    const defaultAssignmentA: DayCompanyAssignment = {
      status: isWeekend || isHoliday ? 'off' : 'work',
      shiftName: isWeekend ? 'Libur' : 'Office Hour (09:00 - 18:00)',
      overtimeHours: 0,
    };

    const defaultAssignmentB: DayCompanyAssignment = {
      status: isWeekend ? 'work' : 'off', // Sambilan di weekend / harian
      shiftName: isWeekend ? 'Weekend Shift' : 'Off',
      overtimeHours: 0,
    };

    scheduleDays.push({
      date: dateStr,
      dayOfWeek,
      dayNumber: d,
      month,
      year,
      isHoliday,
      holidayName,
      assignments: {
        [defaultCompanyAId]: defaultAssignmentA,
        [defaultCompanyBId]: defaultAssignmentB,
      },
    });
  }

  return scheduleDays;
}

/**
 * Menghitung Total Kehadiran, Hari Masuk, Cuti, dan Lembur per Perusahaan pada Range Cut-off
 */
export function calculateCompanyScheduleAttendance(
  companyId: string,
  scheduleDaysMap: Record<string, WorkScheduleDay>,
  dateList: string[]
): {
  actualWorkingDays: number; // Jumlah hari masuk kerja
  fullWorkDays: number;
  halfDays: number;
  offDays: number;
  leaveDays: number;
  sickDays: number;
  overtimeHours: number;
} {
  let fullWorkDays = 0;
  let offDays = 0;
  let overtimeHours = 0;

  for (const dateStr of dateList) {
    const day = scheduleDaysMap[dateStr];
    if (!day || !day.assignments || !day.assignments[companyId]) {
      // Default: check if weekend
      const dateObj = new Date(dateStr);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      if (isWeekend) {
        offDays++;
      } else {
        fullWorkDays++;
      }
      continue;
    }

    const assignment = day.assignments[companyId];
    overtimeHours += assignment.overtimeHours || 0;

    // Sistem absensi disederhanakan: Kerja atau Libur
    if (assignment.status === 'work' || assignment.status === 'overtime' || assignment.status === 'half_day') {
      fullWorkDays++;
    } else {
      offDays++;
    }
  }

  const actualWorkingDays = fullWorkDays;

  return {
    actualWorkingDays,
    fullWorkDays,
    halfDays: 0,
    offDays,
    leaveDays: 0,
    sickDays: 0,
    overtimeHours,
  };
}

/**
 * Default Profile untuk 2 Perusahaan
 */
/**
 * Default Initial Company Profiles (Gaji Pokok + Daily Rate)
 */
export const DEFAULT_COMPANY_A_PROFILE: CompanySalaryProfile = {
  id: 'company_a',
  companyName: 'PT Teknologi Nusantara (Pekerjaan Utama)',
  jobTitle: 'Senior Software Engineer / Lead',
  badgeColor: 'indigo',
  employmentType: 'permanent',
  baseSalary: 12000000, // Gaji Pokok Bulanan
  dailyRate: 150000, // Daily Rate Upah Harian per Kehadiran
  standardWorkingDays: 22,
  isProratedBaseSalary: false,
  isDailyTransport: true,
  dailyTransportRate: 50000, // Uang transport/makan per hari hadir
  fixedAllowance: 2000000, // Tunjangan Tetap / Jabatan
  transportAllowance: 0,
  otherAllowance: 500000,
  overtimeHours: 0,
  overtimeRatePerHour: 0, // 0 = otomatis 1/173
  bonusOrThr: 0,
  includeBpjsKesehatan: true,
  includeBpjsKetenagakerjaan: true,
  calculatePph21: true,
  taxMethod: 'gross',
  ptkpStatus: 'TK/0',
  hasNpwp: true,
  loanOrCashAdvance: 0,
  absenceDeduction: 0,
  cooperativeFee: 0,
  otherDeduction: 0,
  cutOffConfig: {
    cutOffDay: 20, // Tutup penghitungan tgl 20 (periode 21 bln lalu s.d 20 bln ini)
    payDay: 25,
  },
  notes: 'Pekerjaan utama full-time WFO/Hybrid',
};

export const DEFAULT_COMPANY_B_PROFILE: CompanySalaryProfile = {
  id: 'company_b',
  companyName: 'CV Digital Solusi Kreatif (Side Job / Shift)',
  jobTitle: 'Tech Consultant & Specialist',
  badgeColor: 'amber',
  employmentType: 'contract',
  baseSalary: 2500000, // Base bulanan
  dailyRate: 350000, // Rp 350.000 / hari masuk kerja
  standardWorkingDays: 8, // Target 8 hari sebulan
  isProratedBaseSalary: false,
  isDailyTransport: true,
  dailyTransportRate: 35000,
  fixedAllowance: 0,
  transportAllowance: 0,
  otherAllowance: 0,
  overtimeHours: 0,
  overtimeRatePerHour: 60000,
  bonusOrThr: 0,
  includeBpjsKesehatan: false, // Tidak dobel BPJS
  includeBpjsKetenagakerjaan: false,
  calculatePph21: true,
  taxMethod: 'gross',
  ptkpStatus: 'TK/0',
  hasNpwp: true,
  loanOrCashAdvance: 0,
  absenceDeduction: 0,
  cooperativeFee: 0,
  otherDeduction: 0,
  cutOffConfig: {
    cutOffDay: 25, // Tutup penghitungan tgl 25
    payDay: 28,
  },
  notes: 'Sambilan akhir pekan & konsultasi berkala',
};

export const DEFAULT_COMPANIES: CompanySalaryProfile[] = [
  DEFAULT_COMPANY_A_PROFILE,
  DEFAULT_COMPANY_B_PROFILE,
];

/**
 * Color badge utility
 */
export const BADGE_COLOR_MAP: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    pill: string;
    dot: string;
    ring: string;
  }
> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    pill: 'bg-indigo-600 text-white',
    dot: 'bg-indigo-500',
    ring: 'focus:ring-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    pill: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    ring: 'focus:ring-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    pill: 'bg-amber-500 text-slate-900 font-bold',
    dot: 'bg-amber-500',
    ring: 'focus:ring-amber-500',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/50',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    pill: 'bg-cyan-600 text-white',
    dot: 'bg-cyan-500',
    ring: 'focus:ring-cyan-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    pill: 'bg-purple-600 text-white',
    dot: 'bg-purple-500',
    ring: 'focus:ring-purple-500',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    pill: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    ring: 'focus:ring-rose-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    pill: 'bg-blue-600 text-white',
    dot: 'bg-blue-500',
    ring: 'focus:ring-blue-500',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/50',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    pill: 'bg-teal-600 text-white',
    dot: 'bg-teal-500',
    ring: 'focus:ring-teal-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    pill: 'bg-orange-600 text-white',
    dot: 'bg-orange-500',
    ring: 'focus:ring-orange-500',
  },
};

export const WORK_STATUS_META: Record<
  WorkStatus,
  {
    label: string;
    shortLabel: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
  }
> = {
  work: {
    label: 'Masuk Kerja',
    shortLabel: 'Kerja',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  off: {
    label: 'Libur',
    shortLabel: 'Libur',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  // Fallbacks for legacy state compatibility
  half_day: {
    label: 'Masuk Kerja',
    shortLabel: 'Kerja',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  leave: {
    label: 'Libur',
    shortLabel: 'Libur',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  sick: {
    label: 'Libur',
    shortLabel: 'Libur',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  overtime: {
    label: 'Masuk Kerja',
    shortLabel: 'Kerja',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
};
