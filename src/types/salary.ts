// Standar Tarif Pajak PPh 21 TER (Tarif Efektif Rata-rata) sesuai PP 58/2023 & UU HPP
export type PtkpStatus =
  | 'TK/0'
  | 'TK/1'
  | 'TK/2'
  | 'TK/3'
  | 'K/0'
  | 'K/1'
  | 'K/2'
  | 'K/3';

export type TerCategory = 'A' | 'B' | 'C';

export type EmploymentType = 'permanent' | 'contract' | 'freelance' | 'shift' | 'part_time';

export type WorkStatus = 'work' | 'off' | 'leave' | 'sick' | 'overtime' | 'half_day';

export type BadgeColor = 'indigo' | 'emerald' | 'amber' | 'cyan' | 'purple' | 'rose' | 'blue' | 'teal' | 'orange';

export interface CompanyCutOffConfig {
  cutOffDay: number; // Tanggal tutup penghitungan (misal: 20 -> 21 bln lalu s.d 20 bln ini; 31 -> 1 s.d akhir bulan)
  payDay?: number; // Tanggal gajian (misal: 25 atau 1)
  isEndOfWeekOrMonth?: boolean;
}

export interface DayCompanyAssignment {
  status: WorkStatus;
  shiftName?: string; // 'Pagi' | 'Siang' | 'Malam' | 'Full' | 'Fleksibel'
  overtimeHours?: number;
  notes?: string;
}

export interface WorkScheduleDay {
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: number; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  dayNumber: number; // 1-31
  month: number; // 1-12
  year: number;
  assignments: {
    [companyId: string]: DayCompanyAssignment;
  };
  isHoliday?: boolean;
  holidayName?: string;
}

export interface CompanySalaryProfile {
  id: string; // unique ID
  companyName: string;
  jobTitle: string;
  badgeColor: BadgeColor;
  employmentType: EmploymentType;
  
  // Komponen Penghasilan Pokok & Daily Rate
  baseSalary: number; // Gaji Pokok Bulanan (bisa 0 jika murni harian)
  dailyRate: number; // Tarif Upah per Hari Masuk (bisa 0 jika murni gaji bulanan tetap)
  standardWorkingDays: number; // Target hari kerja standar sebulan
  isProratedBaseSalary?: boolean; // Opsi jika gaji pokok diprorata berdasarkan rasio hari masuk

  // Tunjangan
  isDailyTransport: boolean; // Tunjangan transport dihitung per hari hadir
  dailyTransportRate: number; // Nominal transport per hari hadir
  fixedAllowance: number; // Tunjangan Tetap (Jabatan, Keahlian, dll)
  transportAllowance: number; // Tunjangan Transport / Makan (Flat Bulanan jika isDailyTransport false)
  otherAllowance: number; // Tunjangan Lainnya

  // Lembur & Bonus
  overtimeHours: number; // Jam Lembur sebulan (default atau dari jadwal)
  overtimeRatePerHour: number; // Tarif lembur per jam (0 = hitung otomatis 1/173)
  bonusOrThr: number; // Bonus Project / THR / Insentif

  // BPJS & Pajak PPh 21
  includeBpjsKesehatan: boolean;
  includeBpjsKetenagakerjaan: boolean;
  calculatePph21: boolean;
  taxMethod: 'gross' | 'gross_up' | 'nett';
  ptkpStatus: PtkpStatus;
  hasNpwp: boolean;

  // Potongan Lain-lain
  loanOrCashAdvance: number; // Kasbon / Pinjaman
  absenceDeduction: number; // Potongan Keterlambatan / Alfa
  cooperativeFee: number; // Iuran Koperasi / Duka
  otherDeduction: number; // Potongan Lainnya
  deductionNotes?: string;

  // Periode Cut-Off
  cutOffConfig: CompanyCutOffConfig;
  notes?: string;
}

export interface SalaryInput {
  employeeName: string;
  jobTitle?: string;
  companyName?: string;
  companyId?: string;
  employmentType: EmploymentType;
  periodMonth: number; // 1-12
  periodYear: number;
  ptkpStatus: PtkpStatus;
  hasNpwp: boolean;

  // Komponen Pokok + Daily Rate & Kehadiran
  baseSalary: number; // Gaji Pokok Bulanan
  dailyRate: number; // Tarif Upah per Hari Masuk
  standardWorkingDays: number; // Hari kerja standar
  actualWorkingDays: number; // Berapa hari masuk kerja bulan ini (dari kalender / input)
  halfDaysCount?: number;
  leaveDaysCount?: number;
  offDaysCount?: number;
  isProratedBaseSalary?: boolean;
  isDailyTransport?: boolean;
  dailyTransportRate?: number;

  // Cut-off period details
  cutOffStartDate?: string;
  cutOffEndDate?: string;
  cutOffDay?: number;

  // Tunjangan & Lembur
  fixedAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  overtimeHours: number;
  overtimeRatePerHour: number;
  bonusOrThr: number;

  // BPJS & Pajak
  includeBpjsKesehatan: boolean;
  includeBpjsKetenagakerjaan: boolean;
  customBpjsSalaryCap?: number;
  calculatePph21: boolean;
  taxMethod: 'gross' | 'gross_up' | 'nett';

  // Potongan
  loanOrCashAdvance: number;
  absenceDeduction: number;
  cooperativeFee: number;
  otherDeduction: number;
  deductionNotes?: string;
}

export interface BpjsBreakdown {
  // Ditanggung Pekerja (Memotong Gaji)
  employeeBpjsKes: number; // BPJS Kesehatan 1%
  employeeJht: number; // JHT 2%
  employeeJp: number; // JP 1% (capped)
  totalEmployeeBpjs: number;

  // Ditanggung Perusahaan (Benefit / Beban Perusahaan)
  companyBpjsKes: number; // BPJS Kesehatan 4%
  companyJht: number; // JHT 3.7%
  companyJkk: number; // JKK 0.24%
  companyJkm: number; // JKM 0.3%
  companyJp: number; // JP 2% (capped)
  totalCompanyBpjs: number;
}

export interface Pph21Breakdown {
  terCategory: TerCategory;
  terRatePercent: number;
  monthlyPph21: number;
  grossUpTaxAllowance?: number; // Jika metode Gross-up
  annualizedGrossIncome: number;
  annualPtkpAmount: number;
  biayaJabatan: number; // 5% max 500rb/bln atau 6jt/thn
  annualNetIncome: number;
  annualPkp: number; // Penghasilan Kena Pajak
  annualEstimatedTax: number;
}

export interface SalaryCalculationResult {
  id: string;
  createdAt: string;
  input: SalaryInput;

  // Summary Komponen Pokok + Daily Rate
  computedBaseSalary: number; // Gaji Pokok (baseSalary atau prorata)
  computedDailyPay: number; // Upah Harian = dailyRate * actualWorkingDays
  totalBasicIncome: number; // Gaji Pokok + Upah Harian (computedBaseSalary + computedDailyPay)

  computedTransportAllowance: number; // Tunjangan transport aktual (bisa fix atau dailyTransportRate * actualWorkingDays)
  effectiveDailyRate: number; // Nilai tarif harian
  actualWorkingDays: number; // Jumlah hari masuk
  standardWorkingDays: number; // Jumlah hari kerja standar
  grossSalary: number; // Total Penghasilan Bruto (Gaji Pokok + Daily Pay + Tunjangan + Lembur + Bonus)
  totalAllowances: number;
  overtimePay: number;
  
  bpjs: BpjsBreakdown;
  pph21: Pph21Breakdown;

  totalEmployeeDeductions: number; // BPJS Pekerja + PPh 21 + Potongan Lain/Kasbon
  otherDeductionsTotal: number;

  netSalary: number; // THP (Take Home Pay) yang ditransfer ke rekening karyawan
  companyTotalCost: number; // Total Biaya Pengeluaran Perusahaan (Gross + BPJS Perusahaan)
}

export interface SalarySlipTemplate {
  companyName: string;
  companyAddress?: string;
  companyLogo?: string;
  periodName: string;
  slipNumber: string;
  signatureName?: string;
  signatureTitle?: string;
}
