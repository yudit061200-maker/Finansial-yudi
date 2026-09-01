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

export type EmploymentType = 'permanent' | 'contract' | 'freelance';

export type SalaryBasis = 'monthly' | 'daily';

export type WorkStatus = 'work' | 'off' | 'leave' | 'sick' | 'overtime' | 'half_day';

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
  id: string; // 'company_a' | 'company_b'
  companyName: string;
  jobTitle: string;
  badgeColor: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'purple' | 'rose';
  employmentType: EmploymentType;
  salaryBasis: SalaryBasis;
  baseSalary: number;
  dailyRate: number;
  standardWorkingDays: number;
  isProratedMonthly: boolean;
  isDailyTransport: boolean;
  dailyTransportRate: number;
  fixedAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  overtimeHours: number;
  overtimeRatePerHour: number;
  bonusOrThr: number;

  includeBpjsKesehatan: boolean;
  includeBpjsKetenagakerjaan: boolean;
  calculatePph21: boolean;
  taxMethod: 'gross' | 'gross_up' | 'nett';
  ptkpStatus: PtkpStatus;
  hasNpwp: boolean;

  loanOrCashAdvance: number;
  absenceDeduction: number;
  cooperativeFee: number;
  otherDeduction: number;
  deductionNotes?: string;

  cutOffConfig: CompanyCutOffConfig;
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

  // Basis Penggajian & Kehadiran (Working Days & Daily Rate)
  salaryBasis: SalaryBasis; // 'monthly' (Bulanan) atau 'daily' (Harian / Daily Rate)
  dailyRate: number; // Tarif Upah per Hari Masuk (untuk mode 'daily')
  standardWorkingDays: number; // Hari kerja standar dalam sebulan (default: 21 atau 22)
  actualWorkingDays: number; // Berapa hari masuk kerja bulan ini (dari kalkulasi kalender)
  halfDaysCount?: number; // Jumlah hari setengah hari (dihitung 0.5)
  leaveDaysCount?: number; // Jumlah cuti / izin
  offDaysCount?: number; // Jumlah hari libur
  isProratedMonthly?: boolean; // Jika bulanan, apakah gaji pokok dihitung prorata sesuai hari masuk
  isDailyTransport?: boolean; // Hitung uang makan & transport otomatis per hari masuk
  dailyTransportRate?: number; // Tarif transport & makan per hari hadir

  // Cut-off period details
  cutOffStartDate?: string;
  cutOffEndDate?: string;
  cutOffDay?: number;

  // Penghasilan (Earnings)
  baseSalary: number; // Gaji Pokok (jika bulanan) atau hasil perkalian daily rate
  fixedAllowance: number; // Tunjangan Tetap (Jabatan, dll)
  transportAllowance: number; // Tunjangan Transport / Makan
  otherAllowance: number; // Tunjangan Lainnya
  overtimeHours: number; // Jam Lembur
  overtimeRatePerHour: number; // Tarif lembur per jam (otomatis atau kustom)
  bonusOrThr: number; // Bonus / THR / Insentif

  // BPJS & Asuransi Ketenagakerjaan
  includeBpjsKesehatan: boolean; // 1% Pekerja, 4% Perusahaan
  includeBpjsKetenagakerjaan: boolean; // JHT (2% Pekerja, 3.7% Perusahaan), JP (1% Pekerja, 2% Perusahaan), JKK (0.24%), JKM (0.3%)
  customBpjsSalaryCap?: number; // Default cap BPJS Kesehatan Rp 12.000.000, BPJS JP Rp 10.042.300
  
  // Pajak PPh 21
  calculatePph21: boolean;
  taxMethod: 'gross' | 'gross_up' | 'nett'; // Gross (karyawan bayar), Gross-up (tunjangan pajak), Nett (perusahaan tanggung)

  // Potongan Lain-lain (Deductions)
  loanOrCashAdvance: number; // Kasbon / Pinjaman Karyawan
  absenceDeduction: number; // Potongan Ketidakhadiran / Terlambat
  cooperativeFee: number; // Iuran Koperasi / Duka
  otherDeduction: number; // Potongan Lainnya
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

  // Summary
  computedBaseSalary: number; // Gaji pokok aktual (bisa dari bulanan atau dailyRate * actualWorkingDays)
  computedTransportAllowance: number; // Tunjangan transport aktual (bisa fix atau dailyTransportRate * actualWorkingDays)
  effectiveDailyRate: number; // Nilai tarif harian efektif
  actualWorkingDays: number; // Jumlah hari masuk
  standardWorkingDays: number; // Jumlah hari kerja standar
  grossSalary: number; // Total Penghasilan Bruto (Gaji Pokok + Tunjangan + Lembur + Bonus)
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
