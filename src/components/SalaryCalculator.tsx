import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  SalaryInput,
  SalaryCalculationResult,
  CompanySalaryProfile,
  WorkScheduleDay,
  SalaryBasis,
  PtkpStatus,
  EmploymentType,
} from '../types/salary';
import { Account } from '../types/finance';
import { calculateSalary, PTKP_RATES, getTerCategory } from '../utils/salaryCalculator';
import {
  DEFAULT_COMPANY_A_PROFILE,
  DEFAULT_COMPANY_B_PROFILE,
  getCutOffDateRange,
  calculateCompanyScheduleAttendance,
  generateMonthScheduleDays,
} from '../utils/scheduleHelper';
import { formatRupiah } from '../utils/formatters';
import { WorkScheduleCalendar } from './WorkScheduleCalendar';
import {
  Calculator,
  Building,
  User,
  CreditCard,
  Receipt,
  FileCheck,
  Download,
  Printer,
  Sparkles,
  Plus,
  Minus,
  HelpCircle,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldAlert,
  Save,
  Share2,
  Calendar,
  Clock,
  Zap,
  Building2,
  CalendarCheck,
  FileText,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface SalaryCalculatorProps {
  accounts: Account[];
  isPrivacyMode?: boolean;
  onSaveSalaryToIncome?: (salaryResult: SalaryCalculationResult, targetAccountId: string) => void;
}

const STORAGE_KEY_COMPANY_A = 'arthasmart_company_a_v1';
const STORAGE_KEY_COMPANY_B = 'arthasmart_company_b_v1';
const STORAGE_KEY_SCHEDULES = 'arthasmart_schedules_v1';

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({
  accounts,
  isPrivacyMode = false,
  onSaveSalaryToIncome,
}) => {
  const [employeeName, setEmployeeName] = useState('Yudit Hermawan');
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());

  // Company Profiles (State with LocalStorage fallback)
  const [companyA, setCompanyA] = useState<CompanySalaryProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPANY_A);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_COMPANY_A_PROFILE;
  });

  const [companyB, setCompanyB] = useState<CompanySalaryProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPANY_B);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_COMPANY_B_PROFILE;
  });

  // Schedules Map: key = "YYYY-MM-DD"
  const [schedules, setSchedules] = useState<Record<string, WorkScheduleDay>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {};
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_A, JSON.stringify(companyA));
    } catch (e) {}
  }, [companyA]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_B, JSON.stringify(companyB));
    } catch (e) {}
  }, [companyB]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch (e) {}
  }, [schedules]);

  // Active View Tab: 'calendar' | 'company_a' | 'company_b' | 'combined' | 'tax_info'
  const [activeTab, setActiveTab] = useState<'calendar' | 'company_a' | 'company_b' | 'combined' | 'tax_info'>('calendar');

  // Slip Printing Mode: 'combined' | 'company_a' | 'company_b'
  const [slipMode, setSlipMode] = useState<'combined' | 'company_a' | 'company_b'>('combined');

  // Target Account for Auto-deposit to cashflow
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [isSavedAsIncomeA, setIsSavedAsIncomeA] = useState(false);
  const [isSavedAsIncomeB, setIsSavedAsIncomeB] = useState(false);
  const [isSavedAsIncomeCombined, setIsSavedAsIncomeCombined] = useState(false);

  // Print Slip Ref
  const slipRef = useRef<HTMLDivElement>(null);

  // Months name in Indonesian
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const periodLabel = `${monthNames[periodMonth - 1]} ${periodYear}`;

  // Mask amounts in privacy mode
  const formatMoney = (val: number) => {
    if (isPrivacyMode) return 'Rp ••••••••';
    return formatRupiah(val);
  };

  // 1. Calculate Cut-Off Date Range for Company A & Company B
  const cutOffA = useMemo(() => {
    return getCutOffDateRange(periodYear, periodMonth, companyA.cutOffConfig.cutOffDay);
  }, [periodYear, periodMonth, companyA.cutOffConfig.cutOffDay]);

  const cutOffB = useMemo(() => {
    return getCutOffDateRange(periodYear, periodMonth, companyB.cutOffConfig.cutOffDay);
  }, [periodYear, periodMonth, companyB.cutOffConfig.cutOffDay]);

  // 2. Calculate Attendance from Schedules within respective Cut-Off Ranges
  const attendanceA = useMemo(() => {
    return calculateCompanyScheduleAttendance('company_a', schedules, cutOffA.dateList);
  }, [schedules, cutOffA]);

  const attendanceB = useMemo(() => {
    return calculateCompanyScheduleAttendance('company_b', schedules, cutOffB.dateList);
  }, [schedules, cutOffB]);

  // 3. Compile SalaryInput for Company A
  const inputA: SalaryInput = useMemo(() => {
    return {
      employeeName,
      jobTitle: companyA.jobTitle,
      companyName: companyA.companyName,
      companyId: companyA.id,
      employmentType: companyA.employmentType,
      periodMonth,
      periodYear,
      ptkpStatus: companyA.ptkpStatus,
      hasNpwp: companyA.hasNpwp,
      salaryBasis: companyA.salaryBasis,
      dailyRate: companyA.dailyRate,
      standardWorkingDays: companyA.standardWorkingDays,
      actualWorkingDays: attendanceA.actualWorkingDays,
      halfDaysCount: attendanceA.halfDays,
      leaveDaysCount: attendanceA.leaveDays,
      offDaysCount: attendanceA.offDays,
      isProratedMonthly: companyA.isProratedMonthly,
      isDailyTransport: companyA.isDailyTransport,
      dailyTransportRate: companyA.dailyTransportRate,
      cutOffStartDate: cutOffA.startDate,
      cutOffEndDate: cutOffA.endDate,
      cutOffDay: companyA.cutOffConfig.cutOffDay,
      baseSalary: companyA.baseSalary,
      fixedAllowance: companyA.fixedAllowance,
      transportAllowance: companyA.transportAllowance,
      otherAllowance: companyA.otherAllowance,
      overtimeHours: attendanceA.overtimeHours || companyA.overtimeHours,
      overtimeRatePerHour: companyA.overtimeRatePerHour,
      bonusOrThr: companyA.bonusOrThr,
      includeBpjsKesehatan: companyA.includeBpjsKesehatan,
      includeBpjsKetenagakerjaan: companyA.includeBpjsKetenagakerjaan,
      calculatePph21: companyA.calculatePph21,
      taxMethod: companyA.taxMethod,
      loanOrCashAdvance: companyA.loanOrCashAdvance,
      absenceDeduction: companyA.absenceDeduction,
      cooperativeFee: companyA.cooperativeFee,
      otherDeduction: companyA.otherDeduction,
      deductionNotes: companyA.deductionNotes,
    };
  }, [employeeName, companyA, periodMonth, periodYear, attendanceA, cutOffA]);

  // 4. Compile SalaryInput for Company B
  const inputB: SalaryInput = useMemo(() => {
    return {
      employeeName,
      jobTitle: companyB.jobTitle,
      companyName: companyB.companyName,
      companyId: companyB.id,
      employmentType: companyB.employmentType,
      periodMonth,
      periodYear,
      ptkpStatus: companyB.ptkpStatus,
      hasNpwp: companyB.hasNpwp,
      salaryBasis: companyB.salaryBasis,
      dailyRate: companyB.dailyRate,
      standardWorkingDays: companyB.standardWorkingDays,
      actualWorkingDays: attendanceB.actualWorkingDays,
      halfDaysCount: attendanceB.halfDays,
      leaveDaysCount: attendanceB.leaveDays,
      offDaysCount: attendanceB.offDays,
      isProratedMonthly: companyB.isProratedMonthly,
      isDailyTransport: companyB.isDailyTransport,
      dailyTransportRate: companyB.dailyTransportRate,
      cutOffStartDate: cutOffB.startDate,
      cutOffEndDate: cutOffB.endDate,
      cutOffDay: companyB.cutOffConfig.cutOffDay,
      baseSalary: companyB.baseSalary,
      fixedAllowance: companyB.fixedAllowance,
      transportAllowance: companyB.transportAllowance,
      otherAllowance: companyB.otherAllowance,
      overtimeHours: attendanceB.overtimeHours || companyB.overtimeHours,
      overtimeRatePerHour: companyB.overtimeRatePerHour,
      bonusOrThr: companyB.bonusOrThr,
      includeBpjsKesehatan: companyB.includeBpjsKesehatan,
      includeBpjsKetenagakerjaan: companyB.includeBpjsKetenagakerjaan,
      calculatePph21: companyB.calculatePph21,
      taxMethod: companyB.taxMethod,
      loanOrCashAdvance: companyB.loanOrCashAdvance,
      absenceDeduction: companyB.absenceDeduction,
      cooperativeFee: companyB.cooperativeFee,
      otherDeduction: companyB.otherDeduction,
      deductionNotes: companyB.deductionNotes,
    };
  }, [employeeName, companyB, periodMonth, periodYear, attendanceB, cutOffB]);

  // 5. Calculate Results for both
  const resultA: SalaryCalculationResult = useMemo(() => {
    return calculateSalary(inputA);
  }, [inputA]);

  const resultB: SalaryCalculationResult = useMemo(() => {
    return calculateSalary(inputB);
  }, [inputB]);

  // 6. Combined Dual-Company Metrics
  const combinedNetSalary = resultA.netSalary + resultB.netSalary;
  const combinedGrossSalary = resultA.grossSalary + resultB.grossSalary;
  const combinedTotalTax = resultA.pph21.monthlyPph21 + resultB.pph21.monthlyPph21;
  const combinedTotalBpjs = resultA.bpjs.totalEmployeeBpjs + resultB.bpjs.totalEmployeeBpjs;
  const combinedTotalDaysWorked = attendanceA.actualWorkingDays + attendanceB.actualWorkingDays;

  // Handlers for profile updates
  const handleUpdateCompanyA = (updated: Partial<CompanySalaryProfile>) => {
    setIsSavedAsIncomeA(false);
    setIsSavedAsIncomeCombined(false);
    setCompanyA((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateCompanyB = (updated: Partial<CompanySalaryProfile>) => {
    setIsSavedAsIncomeB(false);
    setIsSavedAsIncomeCombined(false);
    setCompanyB((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateScheduleDay = (dateStr: string, dayData: WorkScheduleDay) => {
    setIsSavedAsIncomeA(false);
    setIsSavedAsIncomeB(false);
    setIsSavedAsIncomeCombined(false);
    setSchedules((prev) => ({
      ...prev,
      [dateStr]: dayData,
    }));
  };

  const handleBatchUpdateSchedules = (updates: Record<string, WorkScheduleDay>) => {
    setIsSavedAsIncomeA(false);
    setIsSavedAsIncomeB(false);
    setIsSavedAsIncomeCombined(false);
    setSchedules((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Deposit Handlers
  const handleSaveIncome = (target: 'company_a' | 'company_b' | 'combined') => {
    if (!onSaveSalaryToIncome || !selectedAccountId) return;

    if (target === 'company_a') {
      onSaveSalaryToIncome(resultA, selectedAccountId);
      setIsSavedAsIncomeA(true);
    } else if (target === 'company_b') {
      onSaveSalaryToIncome(resultB, selectedAccountId);
      setIsSavedAsIncomeB(true);
    } else if (target === 'combined') {
      // Save combined summary as custom salary calculation
      const combinedSyntheticResult: SalaryCalculationResult = {
        ...resultA,
        id: `combined_${Date.now()}`,
        grossSalary: combinedGrossSalary,
        netSalary: combinedNetSalary,
        input: {
          ...resultA.input,
          companyName: `${companyA.companyName} + ${companyB.companyName} (Gabungan 2 Perusahaan)`,
          jobTitle: `${companyA.jobTitle} & ${companyB.jobTitle}`,
        },
      };
      onSaveSalaryToIncome(combinedSyntheticResult, selectedAccountId);
      setIsSavedAsIncomeCombined(true);
    }
  };

  // Print Slip
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-Company THP Summary Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-indigo-400" />
                  Dual-Company Multi Payroll & Schedule
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {periodLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Penghitungan Gaji 2 Perusahaan & Jadwal Kerja
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl">
                Otomatisasi perhitungan gaji berdasarkan kalender hari masuk, lembur, dan tanggal tutup cut-off terpisah untuk pekerjaan utama dan side job/harian Anda.
              </p>
            </div>

            {/* Quick Period Selector */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-sm self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (periodMonth === 1) {
                    setPeriodMonth(12);
                    setPeriodYear(periodYear - 1);
                  } else {
                    setPeriodMonth(periodMonth - 1);
                  }
                }}
                className="px-2 py-1 rounded-xl hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                ◀
              </button>
              <div className="px-2 text-xs font-bold font-mono text-indigo-300">
                {periodLabel}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (periodMonth === 12) {
                    setPeriodMonth(1);
                    setPeriodYear(periodYear + 1);
                  } else {
                    setPeriodMonth(periodMonth + 1);
                  }
                }}
                className="px-2 py-1 rounded-xl hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>

          {/* 3 Bento Metric Cards (PT A, PT B, Combined THP) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            {/* PT A Quick Overview */}
            <div className="bg-slate-800/60 border border-indigo-500/30 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5 truncate max-w-[160px]">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  {companyA.companyName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Tutup tgl {companyA.cutOffConfig.cutOffDay}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                {formatMoney(resultA.netSalary)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>{attendanceA.actualWorkingDays} Hari Masuk</span>
                <span className="text-emerald-400">Gross {formatMoney(resultA.grossSalary)}</span>
              </div>
            </div>

            {/* PT B Quick Overview */}
            <div className="bg-slate-800/60 border border-amber-500/30 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 truncate max-w-[160px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {companyB.companyName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Tutup tgl {companyB.cutOffConfig.cutOffDay}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                {formatMoney(resultB.netSalary)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>{attendanceB.actualWorkingDays} Hari Masuk ({companyB.salaryBasis === 'daily' ? 'Harian' : 'Bulanan'})</span>
                <span className="text-amber-400">Gross {formatMoney(resultB.grossSalary)}</span>
              </div>
            </div>

            {/* Combined Total THP Card */}
            <div className="bg-indigo-600/30 border border-indigo-400/40 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Total THP Bersih (2 Perusahaan)
                </span>
                <span className="text-[10px] font-bold bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">
                  {combinedTotalDaysWorked} Hari Kerja
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatMoney(combinedNetSalary)}
              </div>
              <div className="text-[11px] text-indigo-200/80 flex items-center justify-between font-mono">
                <span>Pajak Total: {formatMoney(combinedTotalTax)}</span>
                <span className="text-emerald-300">Total Bruto: {formatMoney(combinedGrossSalary)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Kalender Schedule & Tutup Cut-Off</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company_a')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'company_a'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building className="w-4 h-4 text-indigo-600" />
          <span>PT A: {companyA.companyName.split(' ')[0]}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company_b')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'company_b'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-600" />
          <span>PT B: {companyB.companyName.split(' ')[0]}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('combined')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'combined'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>Ringkasan Total & Slip Gaji</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax_info')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ml-auto ${
            activeTab === 'tax_info'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Ketentuan PPh 21 TER & BPJS</span>
        </button>
      </div>

      {/* TAB 1: WORK SCHEDULE & CUT-OFF CALENDAR */}
      {activeTab === 'calendar' && (
        <WorkScheduleCalendar
          year={periodYear}
          month={periodMonth}
          onYearMonthChange={(y, m) => {
            setPeriodYear(y);
            setPeriodMonth(m);
          }}
          companyA={companyA}
          companyB={companyB}
          onUpdateCompanyProfile={(cid, updated) => {
            if (cid === 'company_a') handleUpdateCompanyA(updated);
            else handleUpdateCompanyB(updated);
          }}
          schedules={schedules}
          onUpdateScheduleDay={handleUpdateScheduleDay}
          onBatchUpdateSchedules={handleBatchUpdateSchedules}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {/* TAB 2: COMPANY A FORM & CALCULATION */}
      {activeTab === 'company_a' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Profile & Earnings Configuration */}
          <div className="lg:col-span-7 space-y-5">
            {/* Company Info & Cut-off Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pengaturan Perusahaan A (Pekerjaan Utama)
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  Tutup Tgl {companyA.cutOffConfig.cutOffDay}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Perusahaan / Instansi
                  </label>
                  <input
                    type="text"
                    value={companyA.companyName}
                    onChange={(e) => handleUpdateCompanyA({ companyName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    value={companyA.jobTitle}
                    onChange={(e) => handleUpdateCompanyA({ jobTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tanggal Tutup Penghitungan (Cut-off)
                  </label>
                  <select
                    value={companyA.cutOffConfig.cutOffDay}
                    onChange={(e) =>
                      handleUpdateCompanyA({
                        cutOffConfig: { ...companyA.cutOffConfig, cutOffDay: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value={20}>Tanggal 20 (Periode 21 bln lalu s.d 20 bln ini)</option>
                    <option value={25}>Tanggal 25 (Periode 26 bln lalu s.d 25 bln ini)</option>
                    <option value={28}>Tanggal 28 (Periode 29 bln lalu s.d 28 bln ini)</option>
                    <option value={30}>Tanggal 30 (Periode 1 s.d 30)</option>
                    <option value={31}>Akhir Bulan (Periode 1 s.d 31)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Status Karyawan
                  </label>
                  <select
                    value={companyA.employmentType}
                    onChange={(e) => handleUpdateCompanyA({ employmentType: e.target.value as EmploymentType })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="permanent">Karyawan Tetap (PKWTT)</option>
                    <option value="contract">Karyawan Kontrak (PKWT)</option>
                    <option value="freelance">Freelance / Harian</option>
                  </select>
                </div>
              </div>

              {/* Attendance Sync Status */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Presensi Periode Cut-off ({cutOffA.startDisplay} - {cutOffA.endDisplay})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Otomatis dihitung dari Kalender Jadwal Masuk & Libur
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {attendanceA.actualWorkingDays} / {companyA.standardWorkingDays} Hari Masuk
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Lembur: {attendanceA.overtimeHours} Jam
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings & Allowances */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Komponen Penghasilan PT A
                  </h2>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleUpdateCompanyA({ salaryBasis: 'monthly' })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      companyA.salaryBasis === 'monthly'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCompanyA({ salaryBasis: 'daily' })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      companyA.salaryBasis === 'daily'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Daily Rate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {companyA.salaryBasis === 'daily' ? (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tarif Upah Harian (Daily Rate)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={companyA.dailyRate || ''}
                        onChange={(e) => handleUpdateCompanyA({ dailyRate: Number(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Gaji Pokok Bulanan (Basic Salary)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={companyA.baseSalary || ''}
                        onChange={(e) => handleUpdateCompanyA({ baseSalary: Number(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tunjangan Tetap / Jabatan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={companyA.fixedAllowance || ''}
                      onChange={(e) => handleUpdateCompanyA({ fixedAllowance: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tunjangan Transport & Makan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={companyA.transportAllowance || ''}
                      onChange={(e) => handleUpdateCompanyA({ transportAllowance: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Calculation Breakdown for PT A */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rincian Gaji Bersih PT A
                </h3>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {attendanceA.actualWorkingDays} Hari Masuk
                </span>
              </div>

              {/* Big THP */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  Take Home Pay (THP) PT A
                </span>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {formatMoney(resultA.netSalary)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Bruto: {formatMoney(resultA.grossSalary)} • Potongan: {formatMoney(resultA.totalEmployeeDeductions)}
                </div>
              </div>

              {/* Breakdown details */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Gaji Pokok Aktual</span>
                  <span className="font-mono font-bold">{formatMoney(resultA.computedBaseSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Total Tunjangan</span>
                  <span className="font-mono font-bold">{formatMoney(resultA.totalAllowances)}</span>
                </div>
                {resultA.overtimePay > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Upah Lembur ({attendanceA.overtimeHours} Jam)</span>
                    <span className="font-mono font-bold text-amber-600">{formatMoney(resultA.overtimePay)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>BPJS Ketenagakerjaan & Kesehatan (Pekerja)</span>
                  <span className="font-mono font-bold text-rose-600">-{formatMoney(resultA.bpjs.totalEmployeeBpjs)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Pajak PPh 21 TER ({resultA.pph21.terRatePercent}%)</span>
                  <span className="font-mono font-bold text-rose-600">-{formatMoney(resultA.pph21.monthlyPph21)}</span>
                </div>
              </div>

              {/* Save to Income */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveIncome('company_a')}
                  disabled={isSavedAsIncomeA}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSavedAsIncomeA
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {isSavedAsIncomeA ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tercatat di Kas Masuk ArthaSmart</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Gaji PT A ke ArthaSmart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY B FORM & CALCULATION */}
      {activeTab === 'company_b' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Profile & Earnings Configuration */}
          <div className="lg:col-span-7 space-y-5">
            {/* Company Info & Cut-off Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pengaturan Perusahaan B (Side Job / Harian / Shift)
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                  Tutup Tgl {companyB.cutOffConfig.cutOffDay}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Perusahaan / Proyek B
                  </label>
                  <input
                    type="text"
                    value={companyB.companyName}
                    onChange={(e) => handleUpdateCompanyB({ companyName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Jabatan / Peran
                  </label>
                  <input
                    type="text"
                    value={companyB.jobTitle}
                    onChange={(e) => handleUpdateCompanyB({ jobTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tanggal Tutup Penghitungan (Cut-off)
                  </label>
                  <select
                    value={companyB.cutOffConfig.cutOffDay}
                    onChange={(e) =>
                      handleUpdateCompanyB({
                        cutOffConfig: { ...companyB.cutOffConfig, cutOffDay: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value={20}>Tanggal 20 (Periode 21 bln lalu s.d 20 bln ini)</option>
                    <option value={25}>Tanggal 25 (Periode 26 bln lalu s.d 25 bln ini)</option>
                    <option value={28}>Tanggal 28 (Periode 29 bln lalu s.d 28 bln ini)</option>
                    <option value={30}>Tanggal 30 (Periode 1 s.d 30)</option>
                    <option value={31}>Akhir Bulan (Periode 1 s.d 31)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Sistem Penggajian PT B
                  </label>
                  <select
                    value={companyB.salaryBasis}
                    onChange={(e) => handleUpdateCompanyB({ salaryBasis: e.target.value as SalaryBasis })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="daily">Daily Rate (Upah Harian × Hari Masuk)</option>
                    <option value="monthly">Bulanan (Fixed Monthly)</option>
                  </select>
                </div>
              </div>

              {/* Attendance Sync Status */}
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                    Presensi Periode Cut-off ({cutOffB.startDisplay} - {cutOffB.endDisplay})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Otomatis dihitung dari Kalender Jadwal Masuk & Libur
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {attendanceB.actualWorkingDays} Hari Masuk
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Lembur: {attendanceB.overtimeHours} Jam
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings PT B */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tarif & Komponen Penghasilan PT B
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {companyB.salaryBasis === 'daily' ? (
                  <div className="sm:col-span-2 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                      Tarif Upah per Hari Masuk (Daily Rate)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">Rp</span>
                      <input
                        type="number"
                        value={companyB.dailyRate || ''}
                        onChange={(e) => handleUpdateCompanyB({ dailyRate: Number(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl pl-9 pr-3.5 py-2 text-sm font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-300 pt-1 flex justify-between">
                      <span>Perhitungan: {formatMoney(companyB.dailyRate)} × {attendanceB.actualWorkingDays} hari</span>
                      <span className="font-bold">{formatMoney(resultB.computedBaseSalary)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Gaji Pokok Bulanan PT B
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={companyB.baseSalary || ''}
                        onChange={(e) => handleUpdateCompanyB({ baseSalary: Number(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Uang Transport / Makan per Hari
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={companyB.dailyTransportRate || ''}
                      onChange={(e) => handleUpdateCompanyB({ dailyTransportRate: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Bonus / Insentif Project
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={companyB.bonusOrThr || ''}
                      onChange={(e) => handleUpdateCompanyB({ bonusOrThr: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Calculation Breakdown for PT B */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rincian Gaji Bersih PT B
                </h3>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {attendanceB.actualWorkingDays} Hari Masuk
                </span>
              </div>

              {/* Big THP */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Take Home Pay (THP) PT B
                </span>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  {formatMoney(resultB.netSalary)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Bruto: {formatMoney(resultB.grossSalary)} • Potongan: {formatMoney(resultB.totalEmployeeDeductions)}
                </div>
              </div>

              {/* Breakdown details */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Upah Pokok ({attendanceB.actualWorkingDays} Hari)</span>
                  <span className="font-mono font-bold">{formatMoney(resultB.computedBaseSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Transport & Uang Makan</span>
                  <span className="font-mono font-bold">{formatMoney(resultB.computedTransportAllowance)}</span>
                </div>
                {resultB.overtimePay > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Upah Lembur ({attendanceB.overtimeHours} Jam)</span>
                    <span className="font-mono font-bold text-amber-600">{formatMoney(resultB.overtimePay)}</span>
                  </div>
                )}
                {companyB.bonusOrThr > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span>Bonus Project</span>
                    <span className="font-mono font-bold text-emerald-600">{formatMoney(companyB.bonusOrThr)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Pajak PPh 21 TER ({resultB.pph21.terRatePercent}%)</span>
                  <span className="font-mono font-bold text-rose-600">-{formatMoney(resultB.pph21.monthlyPph21)}</span>
                </div>
              </div>

              {/* Save to Income */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveIncome('company_b')}
                  disabled={isSavedAsIncomeB}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSavedAsIncomeB
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  }`}
                >
                  {isSavedAsIncomeB ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tercatat di Kas Masuk ArthaSmart</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Gaji PT B ke ArthaSmart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMBINED SUMMARY & PRINTABLE SLIP GAJI */}
      {activeTab === 'combined' && (
        <div className="space-y-6">
          {/* Slip Mode Switcher & Print Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setSlipMode('combined')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  slipMode === 'combined'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Rekap Slip Gabungan (2 PT)
              </button>
              <button
                type="button"
                onClick={() => setSlipMode('company_a')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  slipMode === 'company_a'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Slip {companyA.companyName.split(' ')[0]}
              </button>
              <button
                type="button"
                onClick={() => setSlipMode('company_b')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  slipMode === 'company_b'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Slip {companyB.companyName.split(' ')[0]}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveIncome('combined')}
                disabled={isSavedAsIncomeCombined}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSavedAsIncomeCombined
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavedAsIncomeCombined ? 'Tersimpan ke Kas' : 'Simpan Total Gaji Gabungan'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Slip Container */}
          <div
            ref={slipRef}
            className="bg-white text-slate-900 border border-slate-300 rounded-3xl p-6 sm:p-8 shadow-md max-w-3xl mx-auto space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* Slip Header */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
              <div className="space-y-1">
                <div className="text-xl font-black tracking-tight text-slate-900">
                  {slipMode === 'combined'
                    ? 'REKAPITULASI PENGHASILAN DUAL-COMPANY'
                    : slipMode === 'company_a'
                    ? companyA.companyName.toUpperCase()
                    : companyB.companyName.toUpperCase()}
                </div>
                <div className="text-xs text-slate-600">
                  {slipMode === 'combined'
                    ? `Konsolidasi Gaji Bersih dari ${companyA.companyName} & ${companyB.companyName}`
                    : `Slip Gaji Resmi Periode ${periodLabel}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 font-mono">
                  SLIP-{periodYear}-{String(periodMonth).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-500">
                  Periode: {periodLabel}
                </div>
              </div>
            </div>

            {/* Employee & Company Metadata */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">Nama Karyawan: </span>
                  <span className="font-bold text-slate-900">{employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status Pajak: </span>
                  <span className="font-bold text-slate-900">{companyA.ptkpStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500">Total Hari Hadir: </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {slipMode === 'combined'
                      ? `${combinedTotalDaysWorked} Hari (PT A: ${attendanceA.actualWorkingDays}h, PT B: ${attendanceB.actualWorkingDays}h)`
                      : slipMode === 'company_a'
                      ? `${attendanceA.actualWorkingDays} Hari Masuk`
                      : `${attendanceB.actualWorkingDays} Hari Masuk`}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">Periode Cut-Off PT A: </span>
                  <span className="font-mono font-bold text-slate-800">{cutOffA.startDisplay} - {cutOffA.endDisplay}</span>
                </div>
                <div>
                  <span className="text-slate-500">Periode Cut-Off PT B: </span>
                  <span className="font-mono font-bold text-slate-800">{cutOffB.startDisplay} - {cutOffB.endDisplay}</span>
                </div>
              </div>
            </div>

            {/* Income & Deductions Breakdown Tables */}
            {slipMode === 'combined' ? (
              <div className="space-y-5">
                {/* PT A Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>1. Penghasilan {companyA.companyName} (Pekerjaan Utama)</span>
                    <span className="font-mono">{attendanceA.actualWorkingDays} Hari Masuk</span>
                  </div>
                  <div className="space-y-1 text-xs px-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Gaji Pokok Aktual</span>
                      <span className="font-mono font-medium">{formatRupiah(resultA.computedBaseSalary)}</span>
                    </div>
                    {resultA.totalAllowances > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tunjangan Tetap & Transport</span>
                        <span className="font-mono font-medium">{formatRupiah(resultA.totalAllowances)}</span>
                      </div>
                    )}
                    {resultA.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Upah Lembur ({attendanceA.overtimeHours} Jam)</span>
                        <span className="font-mono font-medium">{formatRupiah(resultA.overtimePay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-rose-600">
                      <span>Potongan BPJS & Pajak PPh 21</span>
                      <span className="font-mono font-medium">-{formatRupiah(resultA.totalEmployeeDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                      <span>Subtotal THP PT A</span>
                      <span className="font-mono text-indigo-700">{formatRupiah(resultA.netSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* PT B Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>2. Penghasilan {companyB.companyName} (Side Job / Harian)</span>
                    <span className="font-mono">{attendanceB.actualWorkingDays} Hari Masuk</span>
                  </div>
                  <div className="space-y-1 text-xs px-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        {companyB.salaryBasis === 'daily'
                          ? `Upah Harian (${attendanceB.actualWorkingDays} Hari @ ${formatRupiah(companyB.dailyRate)})`
                          : 'Gaji Pokok'}
                      </span>
                      <span className="font-mono font-medium">{formatRupiah(resultB.computedBaseSalary)}</span>
                    </div>
                    {resultB.computedTransportAllowance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Uang Transport / Makan</span>
                        <span className="font-mono font-medium">{formatRupiah(resultB.computedTransportAllowance)}</span>
                      </div>
                    )}
                    {companyB.bonusOrThr > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Bonus Project</span>
                        <span className="font-mono font-medium">{formatRupiah(companyB.bonusOrThr)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-rose-600">
                      <span>Pajak PPh 21</span>
                      <span className="font-mono font-medium">-{formatRupiah(resultB.totalEmployeeDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                      <span>Subtotal THP PT B</span>
                      <span className="font-mono text-amber-700">{formatRupiah(resultB.netSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Big Grand Total Box */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-300">TOTAL TAKE HOME PAY (GABUNGAN 2 PT)</div>
                    <div className="text-[11px] text-slate-400">Total Penghasilan Masuk Bersih Bulan Ini</div>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {formatRupiah(combinedNetSalary)}
                  </div>
                </div>
              </div>
            ) : (
              // Single Company Slip View
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 border-b pb-1">
                    A. RINCIAN PENGHASILAN (EARNINGS)
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Gaji / Upah Pokok ({slipMode === 'company_a' ? attendanceA.actualWorkingDays : attendanceB.actualWorkingDays} Hari)</span>
                      <span className="font-mono font-medium">
                        {formatRupiah(slipMode === 'company_a' ? resultA.computedBaseSalary : resultB.computedBaseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tunjangan & Transport</span>
                      <span className="font-mono font-medium">
                        {formatRupiah(slipMode === 'company_a' ? resultA.totalAllowances : resultB.totalAllowances)}
                      </span>
                    </div>
                    {(slipMode === 'company_a' ? resultA.overtimePay : resultB.overtimePay) > 0 && (
                      <div className="flex justify-between">
                        <span>Upah Lembur</span>
                        <span className="font-mono font-medium">
                          {formatRupiah(slipMode === 'company_a' ? resultA.overtimePay : resultB.overtimePay)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-rose-700 border-b pb-1">
                    B. POTONGAN (DEDUCTIONS)
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>BPJS Ketenagakerjaan & Kesehatan</span>
                      <span className="font-mono font-medium">
                        {formatRupiah(slipMode === 'company_a' ? resultA.bpjs.totalEmployeeBpjs : resultB.bpjs.totalEmployeeBpjs)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>PPh 21 TER</span>
                      <span className="font-mono font-medium">
                        {formatRupiah(slipMode === 'company_a' ? resultA.pph21.monthlyPph21 : resultB.pph21.monthlyPph21)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-300">TAKE HOME PAY (THP) BERSIH</div>
                    <div className="text-[11px] text-slate-400">Ditransfer ke Rekening Pegawai</div>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {formatRupiah(slipMode === 'company_a' ? resultA.netSalary : resultB.netSalary)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TAX INFO & REGULATIONS */}
      {activeTab === 'tax_info' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Pedoman Pajak PPh 21 TER (PP 58/2023) & BPJS Ketenagakerjaan
            </h2>
          </div>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              Peraturan Pemerintah No. 58 Tahun 2023 memperkenalkan <strong>Tarif Efektif Rata-Rata (TER)</strong> untuk pemotongan PPh 21 bulanan (Masa Pajak Januari s.d. November), yang diklasifikasikan ke dalam 3 Kategori berdasarkan status PTKP:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Kategori TER A:</strong> TK/0 (PTKP Rp 54 jt), TK/1 (Rp 58.5 jt), K/0 (Rp 58.5 jt)</li>
              <li><strong>Kategori TER B:</strong> TK/2, TK/3, K/1, K/2</li>
              <li><strong>Kategori TER C:</strong> K/3 (PTKP Rp 72 jt)</li>
            </ul>
            <p>
              Untuk pekerja di 2 perusahaan, pemotongan pajak dilakukan oleh masing-masing pemotong kerja (perusahaan) sesuai slip masing-masing, dan dapat dilaporkan dalam SPT Tahunan Pribadi 1770 / 1770 S.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
