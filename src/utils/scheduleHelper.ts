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
  actualWorkingDays: number; // Hari kerja penuh + (0.5 * setengah hari)
  fullWorkDays: number;
  halfDays: number;
  offDays: number;
  leaveDays: number;
  sickDays: number;
  overtimeHours: number;
} {
  let fullWorkDays = 0;
  let halfDays = 0;
  let offDays = 0;
  let leaveDays = 0;
  let sickDays = 0;
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

    switch (assignment.status) {
      case 'work':
      case 'overtime':
        fullWorkDays++;
        break;
      case 'half_day':
        halfDays++;
        break;
      case 'leave':
        leaveDays++;
        break;
      case 'sick':
        sickDays++;
        break;
      case 'off':
      default:
        offDays++;
        break;
    }
  }

  const actualWorkingDays = fullWorkDays + halfDays * 0.5;

  return {
    actualWorkingDays,
    fullWorkDays,
    halfDays,
    offDays,
    leaveDays,
    sickDays,
    overtimeHours,
  };
}

/**
 * Default Profile untuk 2 Perusahaan
 */
export const DEFAULT_COMPANY_A_PROFILE: CompanySalaryProfile = {
  id: 'company_a',
  companyName: 'PT Teknologi Nusantara (Pekerjaan Utama)',
  jobTitle: 'Senior Software Engineer / Lead',
  badgeColor: 'indigo',
  employmentType: 'permanent',
  salaryBasis: 'monthly',
  baseSalary: 14500000,
  dailyRate: 659000,
  standardWorkingDays: 22,
  isProratedMonthly: false,
  isDailyTransport: false,
  dailyTransportRate: 50000,
  fixedAllowance: 2500000,
  transportAllowance: 1200000,
  otherAllowance: 500000,
  overtimeHours: 0,
  overtimeRatePerHour: 98000,
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
};

export const DEFAULT_COMPANY_B_PROFILE: CompanySalaryProfile = {
  id: 'company_b',
  companyName: 'CV Digital Solusi Kreatif (Side Job / Harian)',
  jobTitle: 'Consultant & Weekend Specialist',
  badgeColor: 'amber',
  employmentType: 'contract',
  salaryBasis: 'daily', // Daily rate
  baseSalary: 4500000,
  dailyRate: 450000, // Rp 450.000 / hari
  standardWorkingDays: 8, // Target 8 hari sebulan (weekend)
  isProratedMonthly: false,
  isDailyTransport: true,
  dailyTransportRate: 40000, // Rp 40.000 / hari transport
  fixedAllowance: 0,
  transportAllowance: 320000,
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
};

/**
 * Status Metadata Helper
 */
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
    label: 'Masuk Kerja (Full Day)',
    shortLabel: 'Kerja',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  half_day: {
    label: 'Setengah Hari (0.5 Hari)',
    shortLabel: '1/2 Hari',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    textColor: 'text-teal-700 dark:text-teal-300',
    borderColor: 'border-teal-200 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
  off: {
    label: 'Libur (Day Off)',
    shortLabel: 'Libur',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  leave: {
    label: 'Cuti / Izin',
    shortLabel: 'Cuti',
    bgColor: 'bg-sky-50 dark:bg-sky-950/50',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800',
    dotColor: 'bg-sky-500',
  },
  sick: {
    label: 'Sakit (Surat Dokter)',
    shortLabel: 'Sakit',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  overtime: {
    label: 'Lembur / Shift Tambahan',
    shortLabel: 'Lembur',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
};
