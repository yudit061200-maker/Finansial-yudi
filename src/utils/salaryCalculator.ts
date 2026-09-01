import {
  SalaryInput,
  SalaryCalculationResult,
  PtkpStatus,
  TerCategory,
  BpjsBreakdown,
  Pph21Breakdown,
} from '../types/salary';

/**
 * Batas maksimal dasar perhitungan BPJS (Maksimal Plafon 2024-2026):
 * - BPJS Kesehatan: Max Rp 12.000.000
 * - BPJS Ketenagakerjaan Jaminan Pensiun (JP): Max Rp 10.042.300
 */
export const BPJS_KES_MAX_SALARY = 12_000_000;
export const BPJS_JP_MAX_SALARY = 10_042_300;

/**
 * Nilai PTKP (Penghasilan Tidak Kena Pajak) Tahunan Indonesia
 */
export const PTKP_RATES: Record<PtkpStatus, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

/**
 * Pemetaan Status PTKP ke Kategori TER (PP 58/2023):
 * - Kategori A: TK/0 (54 jt), TK/1 (58.5 jt), K/0 (58.5 jt)
 * - Kategori B: TK/2 (63 jt), TK/3 (67.5 jt), K/1 (63 jt), K/2 (67.5 jt)
 * - Kategori C: K/3 (72 jt)
 */
export function getTerCategory(ptkp: PtkpStatus): TerCategory {
  if (ptkp === 'TK/0' || ptkp === 'TK/1' || ptkp === 'K/0') {
    return 'A';
  }
  if (ptkp === 'TK/2' || ptkp === 'TK/3' || ptkp === 'K/1' || ptkp === 'K/2') {
    return 'B';
  }
  return 'C';
}

/**
 * Tabel Tarif Efektif Bulanan TER Kategori A (PP 58/2023)
 */
const TER_A_BRACKETS: Array<{ max: number; rate: number }> = [
  { max: 5_400_000, rate: 0.0 },
  { max: 5_650_000, rate: 0.25 },
  { max: 5_950_000, rate: 0.5 },
  { max: 6_300_000, rate: 0.75 },
  { max: 6_750_000, rate: 1.0 },
  { max: 7_500_000, rate: 1.25 },
  { max: 8_550_000, rate: 1.5 },
  { max: 9_650_000, rate: 1.75 },
  { max: 10_050_000, rate: 2.0 },
  { max: 10_350_000, rate: 2.25 },
  { max: 10_700_000, rate: 2.5 },
  { max: 11_050_000, rate: 3.0 },
  { max: 11_600_000, rate: 3.5 },
  { max: 12_500_000, rate: 4.0 },
  { max: 13_750_000, rate: 5.0 },
  { max: 15_100_000, rate: 6.0 },
  { max: 16_950_000, rate: 7.0 },
  { max: 19_750_000, rate: 8.0 },
  { max: 24_150_000, rate: 9.0 },
  { max: 26_450_000, rate: 10.0 },
  { max: 28_000_000, rate: 11.0 },
  { max: 30_050_000, rate: 12.0 },
  { max: 32_400_000, rate: 13.0 },
  { max: 35_400_000, rate: 14.0 },
  { max: 39_100_000, rate: 15.0 },
  { max: 43_850_000, rate: 16.0 },
  { max: 47_800_000, rate: 17.0 },
  { max: 51_400_000, rate: 18.0 },
  { max: 56_300_000, rate: 19.0 },
  { max: 62_200_000, rate: 20.0 },
  { max: 68_600_000, rate: 21.0 },
  { max: 77_500_000, rate: 22.0 },
  { max: 89_000_000, rate: 23.0 },
  { max: 103_000_000, rate: 24.0 },
  { max: 125_000_000, rate: 25.0 },
  { max: 157_000_000, rate: 26.0 },
  { max: 206_000_000, rate: 27.0 },
  { max: 337_000_000, rate: 28.0 },
  { max: 454_000_000, rate: 29.0 },
  { max: 550_000_000, rate: 30.0 },
  { max: 695_000_000, rate: 31.0 },
  { max: 910_000_000, rate: 32.0 },
  { max: 1_400_000_000, rate: 33.0 },
  { max: Infinity, rate: 34.0 },
];

/**
 * Tabel Tarif Efektif Bulanan TER Kategori B (PP 58/2023)
 */
const TER_B_BRACKETS: Array<{ max: number; rate: number }> = [
  { max: 6_200_000, rate: 0.0 },
  { max: 6_500_000, rate: 0.25 },
  { max: 6_850_000, rate: 0.5 },
  { max: 7_300_000, rate: 0.75 },
  { max: 9_200_000, rate: 1.0 },
  { max: 10_750_000, rate: 1.5 },
  { max: 11_250_000, rate: 2.0 },
  { max: 11_600_000, rate: 2.5 },
  { max: 12_600_000, rate: 3.0 },
  { max: 13_600_000, rate: 4.0 },
  { max: 14_950_000, rate: 5.0 },
  { max: 16_400_000, rate: 6.0 },
  { max: 18_450_000, rate: 7.0 },
  { max: 21_850_000, rate: 8.0 },
  { max: 26_000_000, rate: 9.0 },
  { max: 27_700_000, rate: 10.0 },
  { max: 29_350_000, rate: 11.0 },
  { max: 31_450_000, rate: 12.0 },
  { max: 33_950_000, rate: 13.0 },
  { max: 37_100_000, rate: 14.0 },
  { max: 41_100_000, rate: 15.0 },
  { max: 45_800_000, rate: 16.0 },
  { max: 49_500_000, rate: 17.0 },
  { max: 53_800_000, rate: 18.0 },
  { max: 58_500_000, rate: 19.0 },
  { max: 64_000_000, rate: 20.0 },
  { max: 71_000_000, rate: 21.0 },
  { max: 80_000_000, rate: 22.0 },
  { max: 93_000_000, rate: 23.0 },
  { max: 109_000_000, rate: 24.0 },
  { max: 129_000_000, rate: 25.0 },
  { max: 163_000_000, rate: 26.0 },
  { max: 211_000_000, rate: 27.0 },
  { max: 374_000_000, rate: 28.0 },
  { max: 459_000_000, rate: 29.0 },
  { max: 555_000_000, rate: 30.0 },
  { max: 704_000_000, rate: 31.0 },
  { max: 957_000_000, rate: 32.0 },
  { max: 1_405_000_000, rate: 33.0 },
  { max: Infinity, rate: 34.0 },
];

/**
 * Tabel Tarif Efektif Bulanan TER Kategori C (PP 58/2023)
 */
const TER_C_BRACKETS: Array<{ max: number; rate: number }> = [
  { max: 6_600_000, rate: 0.0 },
  { max: 6_950_000, rate: 0.25 },
  { max: 7_350_000, rate: 0.5 },
  { max: 7_800_000, rate: 0.75 },
  { max: 8_850_000, rate: 1.0 },
  { max: 9_800_000, rate: 1.25 },
  { max: 10_950_000, rate: 1.5 },
  { max: 11_200_000, rate: 1.75 },
  { max: 12_050_000, rate: 2.0 },
  { max: 12_950_000, rate: 3.0 },
  { max: 14_150_000, rate: 4.0 },
  { max: 15_550_000, rate: 5.0 },
  { max: 17_050_000, rate: 6.0 },
  { max: 19_500_000, rate: 7.0 },
  { max: 22_700_000, rate: 8.0 },
  { max: 26_600_000, rate: 9.0 },
  { max: 28_100_000, rate: 10.0 },
  { max: 30_100_000, rate: 11.0 },
  { max: 32_600_000, rate: 12.0 },
  { max: 35_400_000, rate: 13.0 },
  { max: 38_900_000, rate: 14.0 },
  { max: 43_000_000, rate: 15.0 },
  { max: 47_400_000, rate: 16.0 },
  { max: 51_200_000, rate: 17.0 },
  { max: 55_800_000, rate: 18.0 },
  { max: 60_400_000, rate: 19.0 },
  { max: 66_700_000, rate: 20.0 },
  { max: 74_500_000, rate: 21.0 },
  { max: 83_200_000, rate: 22.0 },
  { max: 95_600_000, rate: 23.0 },
  { max: 110_000_000, rate: 24.0 },
  { max: 134_000_000, rate: 25.0 },
  { max: 169_000_000, rate: 26.0 },
  { max: 221_000_000, rate: 27.0 },
  { max: 390_000_000, rate: 28.0 },
  { max: 463_000_000, rate: 29.0 },
  { max: 561_000_000, rate: 30.0 },
  { max: 709_000_000, rate: 31.0 },
  { max: 965_000_000, rate: 32.0 },
  { max: 1_419_000_000, rate: 33.0 },
  { max: Infinity, rate: 34.0 },
];

/**
 * Mencari persentase tarif TER bulanan
 */
export function getMonthlyTerRate(grossMonthlyIncome: number, category: TerCategory): number {
  const brackets =
    category === 'A' ? TER_A_BRACKETS : category === 'B' ? TER_B_BRACKETS : TER_C_BRACKETS;
  
  for (const b of brackets) {
    if (grossMonthlyIncome <= b.max) {
      return b.rate;
    }
  }
  return 34.0;
}

/**
 * Menghitung rincian Iuran BPJS Ketenagakerjaan & BPJS Kesehatan
 */
export function calculateBpjs(
  baseSalary: number,
  fixedAllowance: number,
  includeKes: boolean,
  includeTk: boolean
): BpjsBreakdown {
  const bpjsSalaryBase = baseSalary + fixedAllowance;

  // Batas plafon gaji
  const kesBase = Math.min(bpjsSalaryBase, BPJS_KES_MAX_SALARY);
  const jpBase = Math.min(bpjsSalaryBase, BPJS_JP_MAX_SALARY);

  // 1. BPJS Kesehatan (1% Karyawan, 4% Perusahaan)
  const employeeBpjsKes = includeKes ? Math.round(kesBase * 0.01) : 0;
  const companyBpjsKes = includeKes ? Math.round(kesBase * 0.04) : 0;

  // 2. BPJS Ketenagakerjaan
  // Jaminan Hari Tua (JHT): 2% Karyawan, 3.7% Perusahaan
  const employeeJht = includeTk ? Math.round(bpjsSalaryBase * 0.02) : 0;
  const companyJht = includeTk ? Math.round(bpjsSalaryBase * 0.037) : 0;

  // Jaminan Pensiun (JP): 1% Karyawan, 2% Perusahaan (dibatasi plafon)
  const employeeJp = includeTk ? Math.round(jpBase * 0.01) : 0;
  const companyJp = includeTk ? Math.round(jpBase * 0.02) : 0;

  // JKK (Kecelakaan Kerja): 0.24% Perusahaan
  const companyJkk = includeTk ? Math.round(bpjsSalaryBase * 0.0024) : 0;

  // JKM (Kematian): 0.3% Perusahaan
  const companyJkm = includeTk ? Math.round(bpjsSalaryBase * 0.003) : 0;

  const totalEmployeeBpjs = employeeBpjsKes + employeeJht + employeeJp;
  const totalCompanyBpjs = companyBpjsKes + companyJht + companyJkk + companyJkm + companyJp;

  return {
    employeeBpjsKes,
    employeeJht,
    employeeJp,
    totalEmployeeBpjs,
    companyBpjsKes,
    companyJht,
    companyJkk,
    companyJkm,
    companyJp,
    totalCompanyBpjs,
  };
}

/**
 * Menghitung PPh 21 Bulanan dengan skema TER (Tarif Efektif Rata-rata) sesuai PP 58/2023
 */
export function calculatePph21Ter(
  grossIncome: number,
  ptkpStatus: PtkpStatus,
  hasNpwp: boolean = true,
  taxMethod: 'gross' | 'gross_up' | 'nett' = 'gross'
): Pph21Breakdown {
  const terCategory = getTerCategory(ptkpStatus);
  const terRatePercent = getMonthlyTerRate(grossIncome, terCategory);

  // Jika Gross-Up, ada formula tunjangan pajak
  let grossUpTaxAllowance = 0;
  let effectiveGross = grossIncome;

  if (taxMethod === 'gross_up') {
    // Formula pendekatan tunjangan pajak untuk tarif TER: Tax = (Gross * Rate%) / (1 - Rate%)
    const rateDec = terRatePercent / 100;
    if (rateDec < 1) {
      grossUpTaxAllowance = Math.round((grossIncome * rateDec) / (1 - rateDec));
      effectiveGross = grossIncome + grossUpTaxAllowance;
    }
  }

  // Hitung PPh 21 Bulanan
  let monthlyPph21 = Math.round((effectiveGross * terRatePercent) / 100);

  // Penalti tanpa NPWP (jika ada regulasi tambahan, standarnya tarif normal TER tetap berlaku atau +20% pada akhir tahun)
  if (!hasNpwp) {
    monthlyPph21 = Math.round(monthlyPph21 * 1.2);
  }

  // Estimasi Tahunan untuk simulasi audit SPT
  const annualizedGrossIncome = grossIncome * 12;
  const annualPtkpAmount = PTKP_RATES[ptkpStatus] || 54_000_000;
  
  // Biaya Jabatan (5% max 500rb/bln atau 6jt/thn)
  const biayaJabatan = Math.min(annualizedGrossIncome * 0.05, 6_000_000);
  const annualNetIncome = Math.max(0, annualizedGrossIncome - biayaJabatan);
  const annualPkp = Math.max(0, Math.floor((annualNetIncome - annualPtkpAmount) / 1000) * 1000);

  // Tarif Progresif Pasal 17 UU HPP
  let annualEstimatedTax = 0;
  if (annualPkp > 0) {
    const tier1 = Math.min(annualPkp, 60_000_000);
    annualEstimatedTax += tier1 * 0.05;

    if (annualPkp > 60_000_000) {
      const tier2 = Math.min(annualPkp - 60_000_000, 190_000_000);
      annualEstimatedTax += tier2 * 0.15;
    }
    if (annualPkp > 250_000_000) {
      const tier3 = Math.min(annualPkp - 250_000_000, 250_000_000);
      annualEstimatedTax += tier3 * 0.25;
    }
    if (annualPkp > 500_000_000) {
      const tier4 = Math.min(annualPkp - 500_000_000, 4_500_000_000);
      annualEstimatedTax += tier4 * 0.30;
    }
    if (annualPkp > 5_000_000_000) {
      const tier5 = annualPkp - 5_000_000_000;
      annualEstimatedTax += tier5 * 0.35;
    }
  }

  return {
    terCategory,
    terRatePercent,
    monthlyPph21,
    grossUpTaxAllowance: taxMethod === 'gross_up' ? grossUpTaxAllowance : undefined,
    annualizedGrossIncome,
    annualPtkpAmount,
    biayaJabatan,
    annualNetIncome,
    annualPkp,
    annualEstimatedTax: Math.round(annualEstimatedTax),
  };
}

/**
 * Kalkulator Lengkap Penghitungan Gaji (Payroll & Take Home Pay Calculator)
 * Mendukung Gaji Bulanan Tetap, Gaji Harian (Daily Rate), dan Prorata Kehadiran
 */
export function calculateSalary(input: SalaryInput): SalaryCalculationResult {
  const standardWorkingDays = input.standardWorkingDays > 0 ? input.standardWorkingDays : 21;
  const actualWorkingDays = input.actualWorkingDays >= 0 ? input.actualWorkingDays : standardWorkingDays;

  // 1. Hitung Gaji Pokok Berdasarkan Mode (Monthly vs Daily Rate)
  let computedBaseSalary = 0;
  let effectiveDailyRate = 0;

  if (input.salaryBasis === 'daily') {
    // Mode Harian (Daily Rate x Hari Masuk Kerja)
    effectiveDailyRate = input.dailyRate || 0;
    computedBaseSalary = Math.round(effectiveDailyRate * actualWorkingDays);
  } else {
    // Mode Bulanan
    const rawBase = input.baseSalary || 0;
    effectiveDailyRate = standardWorkingDays > 0 ? Math.round(rawBase / standardWorkingDays) : 0;
    
    if (input.isProratedMonthly && standardWorkingDays > 0) {
      computedBaseSalary = Math.round((rawBase / standardWorkingDays) * actualWorkingDays);
    } else {
      computedBaseSalary = rawBase;
    }
  }

  // 2. Hitung Tunjangan Transport / Makan (Apakah Berbasis Harian atau Tetap)
  let computedTransportAllowance = 0;
  if (input.isDailyTransport) {
    computedTransportAllowance = Math.round((input.dailyTransportRate || 0) * actualWorkingDays);
  } else {
    computedTransportAllowance = input.transportAllowance || 0;
  }

  // 3. Hitung Lembur (Overtime Pay)
  // Rumus standar Depnaker tarif lembur per jam = 1/173 * (Gaji Pokok + Tunjangan Tetap) jika tidak diset manual
  let hourlyRate = input.overtimeRatePerHour;
  if (!hourlyRate || hourlyRate <= 0) {
    const basicSum = computedBaseSalary + (input.fixedAllowance || 0);
    hourlyRate = Math.round(basicSum / 173);
  }
  const overtimePay = Math.round((input.overtimeHours || 0) * hourlyRate);

  // 4. Total Tunjangan
  const totalAllowances =
    (input.fixedAllowance || 0) +
    computedTransportAllowance +
    (input.otherAllowance || 0);

  // 5. Penghasilan Bruto (Gross Income)
  const grossSalary =
    computedBaseSalary +
    totalAllowances +
    overtimePay +
    (input.bonusOrThr || 0);

  // 6. Perhitungan BPJS
  const bpjs = calculateBpjs(
    computedBaseSalary,
    input.fixedAllowance || 0,
    input.includeBpjsKesehatan,
    input.includeBpjsKetenagakerjaan
  );

  // 7. Perhitungan PPh 21 TER
  let pph21: Pph21Breakdown;
  if (input.calculatePph21) {
    pph21 = calculatePph21Ter(grossSalary, input.ptkpStatus, input.hasNpwp, input.taxMethod);
  } else {
    pph21 = {
      terCategory: getTerCategory(input.ptkpStatus),
      terRatePercent: 0,
      monthlyPph21: 0,
      annualizedGrossIncome: grossSalary * 12,
      annualPtkpAmount: PTKP_RATES[input.ptkpStatus] || 54_000_000,
      biayaJabatan: 0,
      annualNetIncome: 0,
      annualPkp: 0,
      annualEstimatedTax: 0,
    };
  }

  // 8. Potongan Lain-lain
  const otherDeductionsTotal =
    (input.loanOrCashAdvance || 0) +
    (input.absenceDeduction || 0) +
    (input.cooperativeFee || 0) +
    (input.otherDeduction || 0);

  // 9. Potongan Karyawan
  // Jika metode pajak 'nett' (perusahaan tanggung) atau 'gross_up' (diberi tunjangan pajak), pph21 tidak mengurangi take home pay karyawan
  const taxCutForEmployee = input.taxMethod === 'gross' ? pph21.monthlyPph21 : 0;
  const totalEmployeeDeductions = bpjs.totalEmployeeBpjs + taxCutForEmployee + otherDeductionsTotal;

  // 10. Take Home Pay (THP)
  let netSalary = grossSalary - totalEmployeeDeductions;
  if (input.taxMethod === 'gross_up' && pph21.grossUpTaxAllowance) {
    // Gross-up: Tambah tunjangan pajak lalu kurangi potongan pajak yang sama
    netSalary = (grossSalary + pph21.grossUpTaxAllowance) - (totalEmployeeDeductions + pph21.monthlyPph21);
  }
  netSalary = Math.max(0, netSalary);

  // 11. Total Biaya Perusahaan (Company Total Cost)
  let taxCostForCompany = 0;
  if (input.taxMethod === 'nett') {
    taxCostForCompany = pph21.monthlyPph21;
  } else if (input.taxMethod === 'gross_up' && pph21.grossUpTaxAllowance) {
    taxCostForCompany = pph21.grossUpTaxAllowance;
  }
  const companyTotalCost = grossSalary + bpjs.totalCompanyBpjs + taxCostForCompany;

  return {
    id: 'sal-' + Date.now(),
    createdAt: new Date().toISOString(),
    input,
    computedBaseSalary,
    computedTransportAllowance,
    effectiveDailyRate,
    actualWorkingDays,
    standardWorkingDays,
    grossSalary,
    totalAllowances,
    overtimePay,
    bpjs,
    pph21,
    totalEmployeeDeductions,
    otherDeductionsTotal,
    netSalary,
    companyTotalCost,
  };
}
