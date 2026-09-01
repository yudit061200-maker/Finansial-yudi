import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  SalaryInput,
  SalaryCalculationResult,
  CompanySalaryProfile,
  WorkScheduleDay,
  PtkpStatus,
  EmploymentType,
  BadgeColor,
} from '../types/salary';
import { Account } from '../types/finance';
import { calculateSalary, PTKP_RATES } from '../utils/salaryCalculator';
import {
  DEFAULT_COMPANIES,
  DEFAULT_COMPANY_A_PROFILE,
  DEFAULT_COMPANY_B_PROFILE,
  getCutOffDateRange,
  calculateCompanyScheduleAttendance,
  BADGE_COLOR_MAP,
} from '../utils/scheduleHelper';
import { formatRupiah } from '../utils/formatters';
import { WorkScheduleCalendar } from './WorkScheduleCalendar';
import { CompanySalaryModal } from './CompanySalaryModal';
import {
  Building,
  CreditCard,
  Receipt,
  Download,
  Printer,
  Sparkles,
  Plus,
  HelpCircle,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  Building2,
  CalendarCheck,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  Wallet,
  Calculator,
} from 'lucide-react';

interface SalaryCalculatorProps {
  accounts: Account[];
  isPrivacyMode?: boolean;
  onSaveSalaryToIncome?: (salaryResult: SalaryCalculationResult, targetAccountId: string) => void;
}

const STORAGE_KEY_COMPANIES = 'arthasmart_companies_v2';
const STORAGE_KEY_SCHEDULES = 'arthasmart_schedules_v2';

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({
  accounts,
  isPrivacyMode = false,
  onSaveSalaryToIncome,
}) => {
  const [employeeName, setEmployeeName] = useState('Yudit Hermawan');
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());

  // Dynamic Companies List State with migration fallback
  const [companies, setCompanies] = useState<CompanySalaryProfile[]>(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEY_COMPANIES);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate from old V1 keys if available
      const savedA = localStorage.getItem('arthasmart_company_a_v1');
      const savedB = localStorage.getItem('arthasmart_company_b_v1');
      if (savedA || savedB) {
        const list: CompanySalaryProfile[] = [];
        if (savedA) list.push({ ...DEFAULT_COMPANY_A_PROFILE, ...JSON.parse(savedA) });
        if (savedB) list.push({ ...DEFAULT_COMPANY_B_PROFILE, ...JSON.parse(savedB) });
        if (list.length > 0) return list;
      }
    } catch (e) {
      console.error('Error loading companies state', e);
    }
    return DEFAULT_COMPANIES;
  });

  // Schedules Map: key = "YYYY-MM-DD"
  const [schedules, setSchedules] = useState<Record<string, WorkScheduleDay>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULES) || localStorage.getItem('arthasmart_schedules_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
    } catch (e) {}
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch (e) {}
  }, [schedules]);

  // Active View Tab: 'calendar' | 'companies_list' | 'combined' | 'tax_info' | companyId
  const [activeTab, setActiveTab] = useState<string>('calendar');

  // Modal State for Add / Edit Company
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanySalaryProfile | null>(null);

  // In-App Confirm Delete Modal & Toast Feedback
  const [companyToDelete, setCompanyToDelete] = useState<CompanySalaryProfile | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Slip Printing Mode: 'combined' | companyId
  const [slipMode, setSlipMode] = useState<string>('combined');

  // Target Account for Auto-deposit to cashflow
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [savedIncomeStatus, setSavedIncomeStatus] = useState<Record<string, boolean>>({});

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

  // Compile calculations for each company dynamically
  const companyCalculations = useMemo(() => {
    return companies.map((comp) => {
      const cutOff = getCutOffDateRange(periodYear, periodMonth, comp.cutOffConfig.cutOffDay);
      const attendance = calculateCompanyScheduleAttendance(comp.id, schedules, cutOff.dateList);

      const salaryInput: SalaryInput = {
        employeeName,
        jobTitle: comp.jobTitle,
        companyName: comp.companyName,
        companyId: comp.id,
        employmentType: comp.employmentType,
        periodMonth,
        periodYear,
        ptkpStatus: comp.ptkpStatus,
        hasNpwp: comp.hasNpwp,
        baseSalary: comp.baseSalary || 0,
        dailyRate: comp.dailyRate || 0,
        standardWorkingDays: comp.standardWorkingDays || 22,
        actualWorkingDays: attendance.actualWorkingDays,
        halfDaysCount: attendance.halfDays,
        leaveDaysCount: attendance.leaveDays,
        offDaysCount: attendance.offDays,
        isProratedBaseSalary: comp.isProratedBaseSalary,
        isDailyTransport: comp.isDailyTransport,
        dailyTransportRate: comp.dailyTransportRate || 0,
        cutOffStartDate: cutOff.startDate,
        cutOffEndDate: cutOff.endDate,
        cutOffDay: comp.cutOffConfig.cutOffDay,
        fixedAllowance: comp.fixedAllowance || 0,
        transportAllowance: comp.transportAllowance || 0,
        otherAllowance: comp.otherAllowance || 0,
        overtimeHours: attendance.overtimeHours || comp.overtimeHours || 0,
        overtimeRatePerHour: comp.overtimeRatePerHour || 0,
        bonusOrThr: comp.bonusOrThr || 0,
        includeBpjsKesehatan: comp.includeBpjsKesehatan,
        includeBpjsKetenagakerjaan: comp.includeBpjsKetenagakerjaan,
        calculatePph21: comp.calculatePph21,
        taxMethod: comp.taxMethod,
        loanOrCashAdvance: comp.loanOrCashAdvance || 0,
        absenceDeduction: comp.absenceDeduction || 0,
        cooperativeFee: comp.cooperativeFee || 0,
        otherDeduction: comp.otherDeduction || 0,
        deductionNotes: comp.deductionNotes,
      };

      const result = calculateSalary(salaryInput);

      return {
        profile: comp,
        cutOff,
        attendance,
        input: salaryInput,
        result,
      };
    });
  }, [companies, schedules, periodYear, periodMonth, employeeName]);

  // Aggregate Totals across all companies
  const totals = useMemo(() => {
    let netSalary = 0;
    let grossSalary = 0;
    let totalBasicIncome = 0;
    let computedBaseSalary = 0;
    let computedDailyPay = 0;
    let totalTax = 0;
    let totalBpjs = 0;
    let totalDaysWorked = 0;
    let totalAllowances = 0;
    let totalOvertimePay = 0;
    let totalDeductions = 0;

    companyCalculations.forEach((item) => {
      netSalary += item.result.netSalary;
      grossSalary += item.result.grossSalary;
      totalBasicIncome += item.result.totalBasicIncome;
      computedBaseSalary += item.result.computedBaseSalary;
      computedDailyPay += item.result.computedDailyPay;
      totalTax += item.result.pph21.monthlyPph21;
      totalBpjs += item.result.bpjs.totalEmployeeBpjs;
      totalDaysWorked += item.attendance.actualWorkingDays;
      totalAllowances += item.result.totalAllowances;
      totalOvertimePay += item.result.overtimePay;
      totalDeductions += item.result.totalEmployeeDeductions;
    });

    return {
      netSalary,
      grossSalary,
      totalBasicIncome,
      computedBaseSalary,
      computedDailyPay,
      totalTax,
      totalBpjs,
      totalDaysWorked,
      totalAllowances,
      totalOvertimePay,
      totalDeductions,
    };
  }, [companyCalculations]);

  // Handlers for Company CRUD
  const handleOpenAddModal = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: CompanySalaryProfile) => {
    setEditingCompany(comp);
    setIsModalOpen(true);
  };

  const handleSaveCompany = (savedCompany: CompanySalaryProfile) => {
    setSavedIncomeStatus({});
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === savedCompany.id);
      if (exists) {
        return prev.map((c) => (c.id === savedCompany.id ? savedCompany : c));
      }
      return [...prev, savedCompany];
    });
  };

  const requestDeleteCompany = (company: CompanySalaryProfile) => {
    if (companies.length <= 1) {
      setToastNotice({
        message: 'Minimal harus ada 1 perusahaan dalam daftar kalkulasi gaji.',
        type: 'warning',
      });
      setTimeout(() => setToastNotice(null), 4000);
      return;
    }
    setCompanyToDelete(company);
  };

  const handleConfirmDeleteCompany = (companyId: string) => {
    const targetComp = companies.find((c) => c.id === companyId);
    const compName = targetComp?.companyName || 'Perusahaan';

    setSavedIncomeStatus({});
    setCompanies((prev) => {
      const updated = prev.filter((c) => c.id !== companyId);
      try {
        localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Clean up schedule assignments for deleted company
    setSchedules((prev) => {
      const updated: Record<string, WorkScheduleDay> = {};
      Object.entries(prev).forEach(([dateStr, dayData]) => {
        if (dayData.assignments && dayData.assignments[companyId]) {
          const newAssignments = { ...dayData.assignments };
          delete newAssignments[companyId];
          updated[dateStr] = {
            ...dayData,
            assignments: newAssignments,
          };
        } else {
          updated[dateStr] = dayData;
        }
      });
      try {
        localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (activeTab === companyId) {
      setActiveTab('companies_list');
    }
    if (slipMode === companyId) {
      setSlipMode('combined');
    }
    setCompanyToDelete(null);

    setToastNotice({
      message: `Perusahaan "${compName}" berhasil dihapus dari sistem.`,
      type: 'success',
    });
    setTimeout(() => setToastNotice(null), 4000);
  };

  const handleDeleteCompany = (companyId: string) => {
    handleConfirmDeleteCompany(companyId);
  };

  const handleDuplicateCompany = (company: CompanySalaryProfile) => {
    const duplicated: CompanySalaryProfile = {
      ...company,
      id: 'comp_' + Date.now(),
      companyName: `${company.companyName} (Salinan)`,
      notes: `Duplikat dari ${company.companyName}`,
    };
    setCompanies((prev) => [...prev, duplicated]);
  };

  const handleUpdateCompanyProfile = (companyId: string, updated: Partial<CompanySalaryProfile>) => {
    setSavedIncomeStatus({});
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, ...updated } : c))
    );
  };

  const handleUpdateScheduleDay = (dateStr: string, dayData: WorkScheduleDay) => {
    setSavedIncomeStatus({});
    setSchedules((prev) => ({
      ...prev,
      [dateStr]: dayData,
    }));
  };

  const handleBatchUpdateSchedules = (updates: Record<string, WorkScheduleDay>) => {
    setSavedIncomeStatus({});
    setSchedules((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Deposit Handlers
  const handleSaveIncome = (targetId: 'combined' | string) => {
    if (!onSaveSalaryToIncome || !selectedAccountId) return;

    if (targetId === 'combined') {
      const firstResult = companyCalculations[0]?.result;
      if (!firstResult) return;

      const combinedSyntheticResult: SalaryCalculationResult = {
        ...firstResult,
        id: `combined_${Date.now()}`,
        grossSalary: totals.grossSalary,
        netSalary: totals.netSalary,
        totalBasicIncome: totals.totalBasicIncome,
        computedBaseSalary: totals.computedBaseSalary,
        computedDailyPay: totals.computedDailyPay,
        input: {
          ...firstResult.input,
          companyName: `Gabungan ${companies.length} Perusahaan (${companies.map((c) => c.companyName.split(' ')[0]).join(', ')})`,
          jobTitle: 'Multi-Company Income',
        },
      };
      onSaveSalaryToIncome(combinedSyntheticResult, selectedAccountId);
      setSavedIncomeStatus((prev) => ({ ...prev, combined: true }));
    } else {
      const match = companyCalculations.find((c) => c.profile.id === targetId);
      if (match) {
        onSaveSalaryToIncome(match.result, selectedAccountId);
        setSavedIncomeStatus((prev) => ({ ...prev, [targetId]: true }));
      }
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
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-indigo-400" />
                  Sistem Gaji Pokok + Daily Rate Multi-Perusahaan
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {periodLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Kalkulator Gaji & Jadwal Kerja Multi-Perusahaan
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl">
                Penghitungan komprehensif <strong>Gaji Pokok + Daily Rate (Upah Harian)</strong> sesuai presensi kalender, jam lembur, serta tanggal cut-off tutup buku masing-masing perusahaan.
              </p>
            </div>

            {/* Quick Period Selector & Add Company Action */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                id="btn-add-company-top"
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Perusahaan
              </button>

              <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-sm">
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
                  title="Bulan Sebelumnya"
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
                  title="Bulan Berikutnya"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Metric Cards (Company Overviews + Grand Total THP) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-2">
            {companyCalculations.map(({ profile, attendance, result, cutOff }) => {
              const meta = BADGE_COLOR_MAP[profile.badgeColor] || BADGE_COLOR_MAP.indigo;
              return (
                <div
                  key={profile.id}
                  className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 space-y-1.5 relative group hover:border-indigo-400/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5 truncate max-w-[150px]">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                      {profile.companyName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(profile)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                      title="Edit Data Gaji"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-lg font-black text-white font-mono">
                    {formatMoney(result.netSalary)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>{attendance.actualWorkingDays} Hari Masuk</span>
                    <span className="text-emerald-400">Gross {formatMoney(result.grossSalary)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/50">
                    <span>Cut-Off Tgl {profile.cutOffConfig.cutOffDay}</span>
                    <span className="text-indigo-300">
                      Pokok {formatMoney(result.computedBaseSalary)} + Daily {formatMoney(result.computedDailyPay)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Combined Grand Total THP Card */}
            <div className="bg-indigo-600/30 border border-indigo-400/40 rounded-2xl p-3.5 space-y-1.5 md:col-span-2 lg:col-span-1 xl:col-span-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Total THP ({companies.length} Perusahaan)
                </span>
                <span className="text-[10px] font-bold bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">
                  {totals.totalDaysWorked} Hari Kerja
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatMoney(totals.netSalary)}
              </div>
              <div className="text-[11px] text-indigo-200/80 flex items-center justify-between font-mono">
                <span>Pajak Total: {formatMoney(totals.totalTax)}</span>
                <span className="text-emerald-300">Total Bruto: {formatMoney(totals.grossSalary)}</span>
              </div>
              <div className="text-[10px] text-indigo-200/60 pt-1 border-t border-indigo-500/30 font-mono">
                Pokok: {formatMoney(totals.computedBaseSalary)} + Upah Harian: {formatMoney(totals.computedDailyPay)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          id="tab-btn-calendar"
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
          id="tab-btn-companies-list"
          type="button"
          onClick={() => setActiveTab('companies_list')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'companies_list'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Kelola Data Perusahaan ({companies.length})</span>
        </button>

        {/* Dynamic tabs for individual companies */}
        {companies.map((comp) => {
          const meta = BADGE_COLOR_MAP[comp.badgeColor] || BADGE_COLOR_MAP.indigo;
          const isActive = activeTab === comp.id;
          return (
            <button
              key={comp.id}
              id={`tab-btn-company-${comp.id}`}
              type="button"
              onClick={() => setActiveTab(comp.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
              <span className="max-w-[120px] truncate">{comp.companyName.split(' ')[0]}</span>
            </button>
          );
        })}

        <button
          id="tab-btn-combined"
          type="button"
          onClick={() => setActiveTab('combined')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'combined'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>Slip Gaji & Rekapitulasi</span>
        </button>

        <button
          id="tab-btn-tax-info"
          type="button"
          onClick={() => setActiveTab('tax_info')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ml-auto ${
            activeTab === 'tax_info'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Info PPh 21 TER</span>
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
          companies={companies}
          onUpdateCompanyProfile={handleUpdateCompanyProfile}
          onEditCompanyModal={handleOpenEditModal}
          onAddCompanyModal={handleOpenAddModal}
          schedules={schedules}
          onUpdateScheduleDay={handleUpdateScheduleDay}
          onBatchUpdateSchedules={handleBatchUpdateSchedules}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {/* TAB 2: MANAGE COMPANIES LIST & SALARY DATA (TAMBAH / EDIT / DUPLIKAT) */}
      {activeTab === 'companies_list' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Daftar & Konfigurasi Data Gaji Perusahaan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola nominal Gaji Pokok, Daily Rate (upah harian), tunjangan, cut-off, serta pengaturan pajak untuk setiap tempat kerja.
              </p>
            </div>
            <button
              id="btn-add-company-in-list"
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Tambah Perusahaan Baru
            </button>
          </div>

          {/* Companies Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {companyCalculations.map(({ profile, attendance, result, cutOff }) => {
              const meta = BADGE_COLOR_MAP[profile.badgeColor] || BADGE_COLOR_MAP.indigo;
              return (
                <div
                  key={profile.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${meta.bg} ${meta.text} border ${meta.border}`}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {profile.companyName}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.bg} ${meta.text}`}>
                              {profile.employmentType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{profile.jobTitle || 'Posisi Karyawan'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(profile)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer"
                          title="Edit Data Gaji"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {companies.length > 1 && (
                          <button
                            id={`btn-delete-company-card-${profile.id}`}
                            type="button"
                            onClick={() => requestDeleteCompany(profile)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                            title="Hapus Perusahaan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Salary Formula Badge: Gaji Pokok + Daily Rate */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Gaji Pokok (Base):</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatRupiah(profile.baseSalary || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Daily Rate (Upah Harian):</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(profile.dailyRate || 0)} / hari
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Siklus Cut-Off:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          Tutup Tgl {profile.cutOffConfig.cutOffDay} ({cutOff.startDisplay} s.d {cutOff.endDisplay})
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">Total Komponen Pokok Aktual ({attendance.actualWorkingDays} Hari):</span>
                        <span className="font-mono text-slate-900 dark:text-white font-bold">
                          {formatRupiah(result.totalBasicIncome)}
                        </span>
                      </div>
                    </div>

                    {/* Quick breakdown preview */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Tunjangan</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatRupiah(result.totalAllowances)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Potongan</span>
                        <span className="font-mono font-semibold text-rose-500">
                          -{formatRupiah(result.totalEmployeeDeductions)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="text-[10px] text-emerald-600 block">THP Bersih</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                          {formatRupiah(result.netSalary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab(profile.id)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Lihat Rincian Lengkap <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(profile)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Data Gaji
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB FOR INDIVIDUAL COMPANY DETAILS */}
      {companies.some((c) => c.id === activeTab) && (() => {
        const currentCompCalc = companyCalculations.find((c) => c.profile.id === activeTab);
        if (!currentCompCalc) return null;
        const { profile, attendance, result, cutOff } = currentCompCalc;
        const meta = BADGE_COLOR_MAP[profile.badgeColor] || BADGE_COLOR_MAP.indigo;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
            {/* Left Form: Profile & Earnings Configuration */}
            <div className="lg:col-span-7 space-y-5">
              {/* Header & Quick Edit Button Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${meta.bg} ${meta.text}`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {profile.companyName}
                      </h2>
                      <p className="text-xs text-slate-500">{profile.jobTitle || 'Posisi Karyawan'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(profile)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Data Gaji
                    </button>
                    {companies.length > 1 && (
                      <button
                        id="btn-delete-company-detail-header"
                        type="button"
                        onClick={() => requestDeleteCompany(profile)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Hapus Perusahaan Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {/* Hybrid Formula Box */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Sistem: Gaji Pokok + Daily Rate
                    </span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                      Presensi: {attendance.actualWorkingDays} Hari Hadir
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-slate-500 text-[11px] block">Gaji Pokok (Nominal)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatRupiah(profile.baseSalary || 0)}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-slate-500 text-[11px] block">Daily Rate ({attendance.actualWorkingDays} × {formatRupiah(profile.dailyRate || 0)})</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatRupiah(result.computedDailyPay)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                      Total Komponen Pokok:
                    </span>
                    <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                      {formatRupiah(result.totalBasicIncome)}
                    </span>
                  </div>
                </div>

                {/* Cut-Off Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Periode Cut-Off: Tgl {profile.cutOffConfig.cutOffDay} ({cutOff.startDisplay} – {cutOff.endDisplay})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Kehadiran dihitung otomatis dari kalender jadwal kerja.
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-emerald-600">{attendance.actualWorkingDays} Hari Masuk</div>
                    <div className="text-[10px] text-slate-400">Lembur {attendance.overtimeHours} Jam</div>
                  </div>
                </div>
              </div>

              {/* Rincian Penghasilan & Tunjangan */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Rincian Tunjangan & Pendapatan Tambahan
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Tunjangan Tetap / Jabatan</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatRupiah(profile.fixedAllowance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">
                      Tunjangan Uang Makan & Transport {profile.isDailyTransport ? `(Harian ${attendance.actualWorkingDays} × ${formatRupiah(profile.dailyTransportRate || 0)})` : '(Flat)'}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatRupiah(result.computedTransportAllowance)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Tunjangan Lainnya</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatRupiah(profile.otherAllowance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Upah Lembur ({attendance.overtimeHours} Jam)</span>
                    <span className="font-mono font-semibold text-amber-600">
                      {formatRupiah(result.overtimePay)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Bonus / THR / Insentif</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {formatRupiah(profile.bonusOrThr || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-white">
                    <span>Total Penghasilan Bruto (Kotor):</span>
                    <span className="font-mono text-emerald-600 text-sm">
                      {formatRupiah(result.grossSalary)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Summary: Potongan & Net Salary Result */}
            <div className="lg:col-span-5 space-y-5">
              {/* THP Result Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300">TAKE HOME PAY (THP)</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                    {profile.companyName}
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {formatMoney(result.netSalary)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gaji bersih yang diterima setelah potongan BPJS & Pajak PPh 21
                  </p>
                </div>

                {/* Auto Deposit Button to Cashflow Wallet */}
                {onSaveSalaryToIncome && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Setor ke Dompet/Rekening:</span>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveIncome(profile.id)}
                      disabled={savedIncomeStatus[profile.id]}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        savedIncomeStatus[profile.id]
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      }`}
                    >
                      {savedIncomeStatus[profile.id] ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Tersimpan ke Arus Kas
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4" />
                          Simpan Gaji Masuk ke Transaksi Kas
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Deductions Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  Rincian Potongan Gaji
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">BPJS Kesehatan (1%)</span>
                    <span className="font-mono text-rose-600">
                      -{formatRupiah(result.bpjs.employeeBpjsKes)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">BPJS Ketenagakerjaan (JHT 2% + JP 1%)</span>
                    <span className="font-mono text-rose-600">
                      -{formatRupiah(result.bpjs.employeeJht + result.bpjs.employeeJp)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">
                      PPh 21 TER ({result.pph21.terCategory} - {result.pph21.terRatePercent}%)
                    </span>
                    <span className="font-mono text-rose-600">
                      -{formatRupiah(result.pph21.monthlyPph21)}
                    </span>
                  </div>
                  {(profile.loanOrCashAdvance || 0) > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Kasbon / Pinjaman</span>
                      <span className="font-mono text-rose-600">
                        -{formatRupiah(profile.loanOrCashAdvance || 0)}
                      </span>
                    </div>
                  )}
                  {(profile.absenceDeduction || 0) > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Potongan Keterlambatan / Alfa</span>
                      <span className="font-mono text-rose-600">
                        -{formatRupiah(profile.absenceDeduction || 0)}
                      </span>
                    </div>
                  )}
                  {(profile.cooperativeFee || 0) > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Iuran Koperasi / Duka</span>
                      <span className="font-mono text-rose-600">
                        -{formatRupiah(profile.cooperativeFee || 0)}
                      </span>
                    </div>
                  )}
                  {(profile.otherDeduction || 0) > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Potongan Lainnya</span>
                      <span className="font-mono text-rose-600">
                        -{formatRupiah(profile.otherDeduction || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-bold text-rose-600">
                    <span>Total Potongan Karyawan:</span>
                    <span className="font-mono text-sm">
                      -{formatRupiah(result.totalEmployeeDeductions)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: REKAPITULASI TOTAL & SLIP GAJI */}
      {activeTab === 'combined' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Slip Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Slip Gaji & Rekapitulasi Multi-Perusahaan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih format slip gabungan seluruh perusahaan atau slip resmi individual per instansi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSlipMode('combined')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    slipMode === 'combined'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua Gabungan ({companies.length} PT)
                </button>
                {companies.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setSlipMode(comp.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      slipMode === comp.id
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {comp.companyName.split(' ')[0]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Printer className="w-4 h-4" />
                Cetak / Simpan PDF
              </button>
            </div>
          </div>

          {/* Deposit Combined to Wallet Card */}
          {onSaveSalaryToIncome && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Otomatisasi Catat Pemasukan Gaji ke Dompet
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Setor total gaji bersih <strong>{formatMoney(totals.netSalary)}</strong> ke rekening aktif.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSaveIncome('combined')}
                  disabled={savedIncomeStatus.combined}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    savedIncomeStatus.combined
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {savedIncomeStatus.combined ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Tersimpan
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Simpan ke Arus Kas
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Printable Formal Slip Container */}
          <div
            ref={slipRef}
            className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md space-y-6 text-slate-900 dark:text-slate-100 print:border-none print:shadow-none print:p-0"
          >
            {/* Slip Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-slate-900 dark:border-white gap-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-bold">
                  DOKUMEN RESMI PENGHASILAN PEGAWAI
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {slipMode === 'combined'
                    ? 'SLIP GAJI & REKAPITULASI MULTI-PERUSAHAAN'
                    : `SLIP GAJI: ${companies.find((c) => c.id === slipMode)?.companyName || 'PERUSAHAAN'}`}
                </h1>
                <p className="text-xs text-slate-500">
                  Sistem Perhitungan: Gaji Pokok + Upah Harian (Daily Rate) + Lembur & Tunjangan
                </p>
              </div>
              <div className="text-left sm:text-right font-mono">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  SLIP-{periodYear}-{String(periodMonth).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500">Periode: {periodLabel}</div>
              </div>
            </div>

            {/* Employee Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-500 block">Nama Karyawan:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{employeeName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Kehadiran Kerja:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {slipMode === 'combined'
                    ? `${totals.totalDaysWorked} Hari Hadir (${companies.length} PT)`
                    : `${companyCalculations.find((c) => c.profile.id === slipMode)?.attendance.actualWorkingDays || 0} Hari Hadir`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tanggal Cetak:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Income & Breakdown Tables */}
            {slipMode === 'combined' ? (
              <div className="space-y-6">
                {companyCalculations.map(({ profile, attendance, result, cutOff }, idx) => {
                  const meta = BADGE_COLOR_MAP[profile.badgeColor] || BADGE_COLOR_MAP.indigo;
                  return (
                    <div key={profile.id} className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`}></span>
                          {idx + 1}. {profile.companyName} ({profile.jobTitle || 'Karyawan'})
                        </span>
                        <span className="font-mono text-indigo-600">
                          {attendance.actualWorkingDays} Hari Hadir (Cut-Off Tgl {profile.cutOffConfig.cutOffDay})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                        {/* Earnings column */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-600 block">Penghasilan:</span>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Gaji Pokok (Nominal)</span>
                            <span className="font-mono">{formatRupiah(result.computedBaseSalary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">
                              Daily Rate ({attendance.actualWorkingDays} × {formatRupiah(profile.dailyRate || 0)})
                            </span>
                            <span className="font-mono text-emerald-600 font-semibold">
                              {formatRupiah(result.computedDailyPay)}
                            </span>
                          </div>
                          {result.totalAllowances > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Tunjangan & Transport</span>
                              <span className="font-mono">{formatRupiah(result.totalAllowances)}</span>
                            </div>
                          )}
                          {result.overtimePay > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Lembur ({attendance.overtimeHours}j)</span>
                              <span className="font-mono text-amber-600">{formatRupiah(result.overtimePay)}</span>
                            </div>
                          )}
                        </div>

                        {/* Deductions column */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-rose-600 block">Potongan:</span>
                          <div className="flex justify-between text-rose-600">
                            <span>BPJS Kesehatan & Ketenagakerjaan</span>
                            <span className="font-mono">-{formatRupiah(result.bpjs.totalEmployeeBpjs)}</span>
                          </div>
                          <div className="flex justify-between text-rose-600">
                            <span>PPh 21 TER ({result.pph21.terCategory})</span>
                            <span className="font-mono">-{formatRupiah(result.pph21.monthlyPph21)}</span>
                          </div>
                          {result.totalEmployeeDeductions - result.bpjs.totalEmployeeBpjs - result.pph21.monthlyPph21 > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Kasbon & Potongan Lainnya</span>
                              <span className="font-mono">
                                -{formatRupiah(result.totalEmployeeDeductions - result.bpjs.totalEmployeeBpjs - result.pph21.monthlyPph21)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                        <span>Subtotal THP Bersih ({profile.companyName.split(' ')[0]}):</span>
                        <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
                          {formatRupiah(result.netSalary)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Grand Total Box */}
                <div className="p-5 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-300">TOTAL TAKE HOME PAY (GABUNGAN SELURUH PERUSAHAAN)</div>
                    <div className="text-[11px] text-slate-400">
                      Total Komponen Pokok: {formatRupiah(totals.totalBasicIncome)} (Pokok: {formatRupiah(totals.computedBaseSalary)} + Daily: {formatRupiah(totals.computedDailyPay)})
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {formatRupiah(totals.netSalary)}
                  </div>
                </div>
              </div>
            ) : (() => {
              const currentSingle = companyCalculations.find((c) => c.profile.id === slipMode);
              if (!currentSingle) return null;
              const { profile, attendance, result } = currentSingle;

              return (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white border-b pb-1">
                      A. RINCIAN PENGHASILAN (EARNINGS)
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span>Gaji Pokok Dasar</span>
                        <span className="font-mono">{formatRupiah(result.computedBaseSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upah Harian ({attendance.actualWorkingDays} Hari @ {formatRupiah(profile.dailyRate || 0)})</span>
                        <span className="font-mono text-emerald-600 font-bold">{formatRupiah(result.computedDailyPay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tunjangan Tetap & Jabatan</span>
                        <span className="font-mono">{formatRupiah(profile.fixedAllowance || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tunjangan Uang Transport & Makan</span>
                        <span className="font-mono">{formatRupiah(result.computedTransportAllowance)}</span>
                      </div>
                      {result.overtimePay > 0 && (
                        <div className="flex justify-between">
                          <span>Upah Lembur ({attendance.overtimeHours} Jam)</span>
                          <span className="font-mono text-amber-600">{formatRupiah(result.overtimePay)}</span>
                        </div>
                      )}
                      {(profile.bonusOrThr || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Bonus / THR / Insentif</span>
                          <span className="font-mono text-emerald-600">{formatRupiah(profile.bonusOrThr || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total Penghasilan Bruto:</span>
                        <span className="font-mono text-emerald-600">{formatRupiah(result.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-rose-600 border-b pb-1">
                      B. POTONGAN (DEDUCTIONS)
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-rose-600">
                        <span>BPJS Kesehatan (1%)</span>
                        <span className="font-mono">-{formatRupiah(result.bpjs.employeeBpjsKes)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>BPJS Ketenagakerjaan (JHT 2% + JP 1%)</span>
                        <span className="font-mono">-{formatRupiah(result.bpjs.employeeJht + result.bpjs.employeeJp)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>PPh 21 TER ({result.pph21.terCategory} - {result.pph21.terRatePercent}%)</span>
                        <span className="font-mono">-{formatRupiah(result.pph21.monthlyPph21)}</span>
                      </div>
                      {(profile.loanOrCashAdvance || 0) > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Kasbon / Pinjaman</span>
                          <span className="font-mono">-{formatRupiah(profile.loanOrCashAdvance || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-rose-600 pt-1 border-t">
                        <span>Total Potongan:</span>
                        <span className="font-mono">-{formatRupiah(result.totalEmployeeDeductions)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900 text-white rounded-3xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-300">TAKE HOME PAY (THP BERSIH)</div>
                      <div className="text-[11px] text-slate-400">Ditransfer ke Rekening Pegawai</div>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {formatRupiah(result.netSalary)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 5: TAX INFO & REGULATIONS */}
      {activeTab === 'tax_info' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Pedoman Perhitungan Pajak PPh 21 TER (PP 58/2023) & BPJS
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
              <strong>Sistem Gaji Pokok + Daily Rate:</strong> Seluruh penghasilan teratur (Gaji Pokok + Upah Harian + Tunjangan Tetap + Transport) digabungkan menjadi Dasar Penghasilan Bruto untuk menentukan tarif persentase TER bulanan.
            </p>
            <p>
              Untuk pekerja di beberapa perusahaan (multi-company), pemotongan pajak dilakukan oleh masing-masing pemotong kerja (perusahaan) sesuai slip masing-masing, dan dapat dilaporkan dalam SPT Tahunan Pribadi Formulir 1770 / 1770 S.
            </p>
          </div>
        </div>
      )}

      {/* Modal Dialog: Add / Edit Company Salary Profile */}
      <CompanySalaryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
        }}
        initialData={editingCompany}
        onSave={handleSaveCompany}
        onDelete={handleDeleteCompany}
        onDuplicate={handleDuplicateCompany}
        canDelete={companies.length > 1}
      />

      {/* IN-APP CONFIRMATION MODAL: HAPUS PERUSAHAAN */}
      {companyToDelete && (
        <div
          id="modal-confirm-delete-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in"
        >
          <div
            id="modal-confirm-delete-container"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Data Perusahaan?
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi tindakan penghapusan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data perusahaan{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{companyToDelete.companyName}"
              </strong>{' '}
              ({companyToDelete.jobTitle || 'Posisi Karyawan'})?
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Data konfigurasi gaji, tunjangan, dan kalkulasi THP perusahaan ini akan dihapus dari sistem.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="btn-cancel-delete-confirm"
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-action"
                type="button"
                onClick={() => handleConfirmDeleteCompany(companyToDelete.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toastNotice && (
        <div
          id="toast-notification-banner"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold transition-all animate-in slide-in-from-bottom-5 ${
            toastNotice.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-amber-900 text-amber-100 border-amber-700'
          }`}
        >
          {toastNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{toastNotice.message}</span>
        </div>
      )}
    </div>
  );
};
