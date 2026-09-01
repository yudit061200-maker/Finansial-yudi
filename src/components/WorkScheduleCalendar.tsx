import React, { useState } from 'react';
import {
  WorkScheduleDay,
  WorkStatus,
  CompanySalaryProfile,
  DayCompanyAssignment,
} from '../types/salary';
import {
  getCutOffDateRange,
  INDONESIAN_HOLIDAYS,
  WORK_STATUS_META,
} from '../utils/scheduleHelper';
import { formatRupiah } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  RotateCcw,
  Check,
  Building2,
  CalendarCheck,
  AlertCircle,
  Plus,
  Minus,
  Sliders,
  Info,
  Zap,
} from 'lucide-react';

interface WorkScheduleCalendarProps {
  year: number;
  month: number; // 1 - 12
  onYearMonthChange: (year: number, month: number) => void;
  companyA: CompanySalaryProfile;
  companyB: CompanySalaryProfile;
  onUpdateCompanyProfile: (companyId: 'company_a' | 'company_b', updated: Partial<CompanySalaryProfile>) => void;
  schedules: Record<string, WorkScheduleDay>;
  onUpdateScheduleDay: (dateStr: string, dayData: WorkScheduleDay) => void;
  onBatchUpdateSchedules: (updates: Record<string, WorkScheduleDay>) => void;
  isPrivacyMode?: boolean;
}

export const WorkScheduleCalendar: React.FC<WorkScheduleCalendarProps> = ({
  year,
  month,
  onYearMonthChange,
  companyA,
  companyB,
  onUpdateCompanyProfile,
  schedules,
  onUpdateScheduleDay,
  onBatchUpdateSchedules,
  isPrivacyMode = false,
}) => {
  // Calendar View Mode: 'cutoff' (Sesuai tanggal tutup) or 'full_month' (1 s.d akhir bulan)
  const [calendarViewMode, setCalendarViewMode] = useState<'cutoff' | 'full_month'>('cutoff');
  
  // Selected Company for Filter / Focus in Calendar: 'all' | 'company_a' | 'company_b'
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<'all' | 'company_a' | 'company_b'>('all');

  // Selected Day for Detail Modal / Popover
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Current Cut-off date ranges for both companies
  const cutOffA = getCutOffDateRange(year, month, companyA.cutOffConfig.cutOffDay);
  const cutOffB = getCutOffDateRange(year, month, companyB.cutOffConfig.cutOffDay);

  // Active view range
  const primaryCutOff = companyA.cutOffConfig.cutOffDay === companyB.cutOffConfig.cutOffDay
    ? cutOffA
    : activeCompanyFilter === 'company_b' ? cutOffB : cutOffA;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (month === 1) {
      onYearMonthChange(year - 1, 12);
    } else {
      onYearMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onYearMonthChange(year + 1, 1);
    } else {
      onYearMonthChange(year, month + 1);
    }
  };

  // Helper to get or construct schedule day
  const getDaySchedule = (dateStr: string, dayNum: number, m: number, y: number): WorkScheduleDay => {
    if (schedules[dateStr]) {
      return schedules[dateStr];
    }
    const dObj = new Date(y, m - 1, dayNum);
    const dayOfWeek = dObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = !!INDONESIAN_HOLIDAYS[dateStr];

    return {
      date: dateStr,
      dayOfWeek,
      dayNumber: dayNum,
      month: m,
      year: y,
      isHoliday,
      holidayName: INDONESIAN_HOLIDAYS[dateStr],
      assignments: {
        company_a: {
          status: isWeekend || isHoliday ? 'off' : 'work',
          shiftName: isWeekend ? 'Libur' : 'Office',
          overtimeHours: 0,
        },
        company_b: {
          status: isWeekend ? 'work' : 'off',
          shiftName: isWeekend ? 'Weekend Shift' : 'Off',
          overtimeHours: 0,
        },
      },
    };
  };

  // Calculate statistics within active cut-off dates
  const calculateAttendance = (companyId: 'company_a' | 'company_b', dateRange: { dateList: string[] }) => {
    let fullWorkDays = 0;
    let halfDays = 0;
    let offDays = 0;
    let leaveDays = 0;
    let sickDays = 0;
    let overtimeHours = 0;

    for (const dStr of dateRange.dateList) {
      const parts = dStr.split('-').map(Number);
      const dayData = getDaySchedule(dStr, parts[2], parts[1], parts[0]);
      const assignment = dayData.assignments[companyId] || { status: 'off', overtimeHours: 0 };

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
  };

  const statsA = calculateAttendance('company_a', cutOffA);
  const statsB = calculateAttendance('company_b', cutOffB);

  // Fast Batch Patterns
  const applyStandardPattern = (pattern: 'senin_jumat' | 'shift_4_2' | 'weekend_b' | 'all_work' | 'all_off') => {
    const newUpdates: Record<string, WorkScheduleDay> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, d);
      const dayOfWeek = dObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = !!INDONESIAN_HOLIDAYS[dateStr];

      const current = getDaySchedule(dateStr, d, month, year);
      const newAssignments = { ...current.assignments };

      if (pattern === 'senin_jumat') {
        // PT A: Senin-Jumat Masuk, PT B: Libur di weekday
        newAssignments.company_a = {
          status: isWeekend || isHoliday ? 'off' : 'work',
          shiftName: isWeekend ? 'Libur' : 'Office',
          overtimeHours: 0,
        };
        newAssignments.company_b = {
          status: isWeekend ? 'work' : 'off',
          shiftName: isWeekend ? 'Weekend Project' : 'Off',
          overtimeHours: 0,
        };
      } else if (pattern === 'weekend_b') {
        // Khusus PT B isi weekend masuk
        newAssignments.company_b = {
          status: isWeekend ? 'work' : 'off',
          shiftName: isWeekend ? 'Weekend Shift' : 'Off',
          overtimeHours: 0,
        };
      } else if (pattern === 'shift_4_2') {
        // Pola 4 hari kerja, 2 hari libur
        const isWorkDay = (d % 6) !== 0 && (d % 6) !== 5;
        newAssignments.company_a = {
          status: isWorkDay ? 'work' : 'off',
          shiftName: isWorkDay ? 'Shift 4-2' : 'Libur',
          overtimeHours: 0,
        };
      } else if (pattern === 'all_work') {
        newAssignments.company_a = { status: 'work', shiftName: 'Masuk', overtimeHours: 0 };
        newAssignments.company_b = { status: 'work', shiftName: 'Masuk', overtimeHours: 0 };
      } else if (pattern === 'all_off') {
        newAssignments.company_a = { status: 'off', shiftName: 'Libur', overtimeHours: 0 };
        newAssignments.company_b = { status: 'off', shiftName: 'Libur', overtimeHours: 0 };
      }

      newUpdates[dateStr] = {
        ...current,
        assignments: newAssignments,
      };
    }

    onBatchUpdateSchedules(newUpdates);
  };

  // Quick single day status cycling
  const handleQuickToggle = (dateStr: string, companyId: 'company_a' | 'company_b', e: React.MouseEvent) => {
    e.stopPropagation();
    const parts = dateStr.split('-').map(Number);
    const day = getDaySchedule(dateStr, parts[2], parts[1], parts[0]);
    const currAssignment = day.assignments[companyId] || { status: 'off', overtimeHours: 0 };

    // Cycle order: work -> half_day -> overtime -> leave -> sick -> off -> work
    const cycleOrder: WorkStatus[] = ['work', 'half_day', 'overtime', 'leave', 'sick', 'off'];
    const currIndex = cycleOrder.indexOf(currAssignment.status);
    const nextStatus = cycleOrder[(currIndex + 1) % cycleOrder.length];

    const updated: WorkScheduleDay = {
      ...day,
      assignments: {
        ...day.assignments,
        [companyId]: {
          ...currAssignment,
          status: nextStatus,
          shiftName: nextStatus === 'work' ? 'Masuk' : nextStatus === 'half_day' ? '1/2 Hari' : nextStatus === 'off' ? 'Libur' : nextStatus,
        },
      },
    };

    onUpdateScheduleDay(dateStr, updated);
  };

  // Cut-off selector options
  const cutOffOptions = [
    { value: 20, label: 'Tutup Tgl 20 (Periode 21 - 20)' },
    { value: 25, label: 'Tutup Tgl 25 (Periode 26 - 25)' },
    { value: 28, label: 'Tutup Tgl 28 (Periode 29 - 28)' },
    { value: 30, label: 'Tutup Tgl 30 (Periode 1 - 30)' },
    { value: 31, label: 'Akhir Bulan (Periode 1 - 31)' },
  ];

  const selectedDayData = selectedDate
    ? getDaySchedule(
        selectedDate,
        Number(selectedDate.split('-')[2]),
        Number(selectedDate.split('-')[1]),
        Number(selectedDate.split('-')[0])
      )
    : null;

  return (
    <div className="space-y-5">
      {/* Top Header Card: Month, Cut-Off Info & View Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Kalender Jadwal Masuk & Libur (2 Perusahaan)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kelola jadwal shift, presensi kerja harian, dan cut-off tutup penghitungan gaji secara otomatis
                </p>
              </div>
            </div>
          </div>

          {/* Month & Year Navigator */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{monthNames[month - 1]} {year}</span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cut-Off Configuration Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* PT A Cut-off Setting */}
          <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 truncate max-w-[180px]">
                  {companyA.companyName}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                {companyA.salaryBasis === 'monthly' ? 'Bulanan' : 'Daily Rate'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="text-[11px] font-semibold text-indigo-900/80 dark:text-indigo-300/80">
                Tutup Penghitungan (Cut-off):
              </label>
              <select
                value={companyA.cutOffConfig.cutOffDay}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateCompanyProfile('company_a', {
                    cutOffConfig: { ...companyA.cutOffConfig, cutOffDay: val },
                  });
                }}
                className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 text-xs font-bold text-indigo-900 dark:text-indigo-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {cutOffOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-mono bg-white/70 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-950">
              <span>Periode: <strong>{cutOffA.startDisplay} - {cutOffA.endDisplay}</strong></span>
              <span className="font-bold text-indigo-900 dark:text-indigo-200">{statsA.actualWorkingDays} Hari Masuk</span>
            </div>
          </div>

          {/* PT B Cut-off Setting */}
          <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 truncate max-w-[180px]">
                  {companyB.companyName}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono">
                {companyB.salaryBasis === 'monthly' ? 'Bulanan' : 'Daily Rate'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="text-[11px] font-semibold text-amber-900/80 dark:text-amber-300/80">
                Tutup Penghitungan (Cut-off):
              </label>
              <select
                value={companyB.cutOffConfig.cutOffDay}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateCompanyProfile('company_b', {
                    cutOffConfig: { ...companyB.cutOffConfig, cutOffDay: val },
                  });
                }}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1 text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {cutOffOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-mono bg-white/70 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-amber-100 dark:border-amber-950">
              <span>Periode: <strong>{cutOffB.startDisplay} - {cutOffB.endDisplay}</strong></span>
              <span className="font-bold text-amber-900 dark:text-amber-200">{statsB.actualWorkingDays} Hari Masuk</span>
            </div>
          </div>
        </div>

        {/* Fast Action Tools & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveCompanyFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCompanyFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua (2 PT)
            </button>
            <button
              type="button"
              onClick={() => setActiveCompanyFilter('company_a')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCompanyFilter === 'company_a'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>{companyA.companyName.split(' ')[0]}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCompanyFilter('company_b')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeCompanyFilter === 'company_b'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>{companyB.companyName.split(' ')[0]}</span>
            </button>
          </div>

          {/* Quick Pattern Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Pola Cepat:</span>
            <button
              type="button"
              onClick={() => applyStandardPattern('senin_jumat')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap"
            >
              Senin-Jumat PT A + Weekend PT B
            </button>
            <button
              type="button"
              onClick={() => applyStandardPattern('shift_4_2')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap"
            >
              Pola Shift 4-2
            </button>
            <button
              type="button"
              onClick={() => applyStandardPattern('all_work')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap"
            >
              Set Semua Masuk
            </button>
            <button
              type="button"
              onClick={() => applyStandardPattern('all_off')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap"
            >
              Reset / Libur
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b border-slate-100 dark:border-slate-800">
          {dayNames.map((dName, idx) => (
            <div
              key={dName}
              className={`text-xs font-bold py-1 ${
                idx === 0 || idx === 6
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {dName}
            </div>
          ))}
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[85px] sm:min-h-[105px] rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-40"
            />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = getDaySchedule(dateStr, dayNum, month, year);
            const isWeekend = dayData.dayOfWeek === 0 || dayData.dayOfWeek === 6;
            const isSelected = selectedDate === dateStr;

            // Check if day is within Cut-off period
            const inCutOffA = cutOffA.dateList.includes(dateStr);
            const inCutOffB = cutOffB.dateList.includes(dateStr);

            const assignA = dayData.assignments.company_a || { status: 'off', overtimeHours: 0 };
            const assignB = dayData.assignments.company_b || { status: 'off', overtimeHours: 0 };

            const metaA = WORK_STATUS_META[assignA.status] || WORK_STATUS_META.off;
            const metaB = WORK_STATUS_META[assignB.status] || WORK_STATUS_META.off;

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
                }`}
              >
                {/* Header: Date Number & Holiday Flag */}
                <div className="flex items-start justify-between">
                  <span
                    className={`text-xs sm:text-sm font-black font-mono leading-none ${
                      isWeekend || dayData.isHoliday
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayData.isHoliday && (
                    <span
                      title={dayData.holidayName}
                      className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                    />
                  )}
                </div>

                {/* Holiday Name Micro text */}
                {dayData.isHoliday && (
                  <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 truncate leading-tight my-0.5">
                    {dayData.holidayName}
                  </div>
                )}

                {/* Assignments Badges for PT A & PT B */}
                <div className="space-y-1 mt-auto">
                  {/* PT A Pill */}
                  {(activeCompanyFilter === 'all' || activeCompanyFilter === 'company_a') && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggle(dateStr, 'company_a', e)}
                      title={`Klik untuk ubah: ${companyA.companyName} (${metaA.label})`}
                      className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-between border ${
                        assignA.status === 'work'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                          : assignA.status === 'half_day'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                          : assignA.status === 'overtime'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                          : assignA.status === 'leave' || assignA.status === 'sick'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></span>
                        <span className="hidden sm:inline">A:</span>
                        <span>{metaA.shortLabel}</span>
                      </span>
                      {assignA.overtimeHours ? (
                        <span className="text-[8px] font-mono font-black text-amber-600">+{assignA.overtimeHours}h</span>
                      ) : null}
                    </button>
                  )}

                  {/* PT B Pill */}
                  {(activeCompanyFilter === 'all' || activeCompanyFilter === 'company_b') && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggle(dateStr, 'company_b', e)}
                      title={`Klik untuk ubah: ${companyB.companyName} (${metaB.label})`}
                      className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all flex items-center justify-between border ${
                        assignB.status === 'work'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          : assignB.status === 'half_day'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                          : assignB.status === 'overtime'
                          ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800'
                          : assignB.status === 'leave' || assignB.status === 'sick'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                        <span className="hidden sm:inline">B:</span>
                        <span>{metaB.shortLabel}</span>
                      </span>
                      {assignB.overtimeHours ? (
                        <span className="text-[8px] font-mono font-black text-amber-600">+{assignB.overtimeHours}h</span>
                      ) : null}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Petunjuk Status:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Masuk Kerja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>1/2 Hari</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Lembur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>Cuti / Izin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span>Libur</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 italic">
            * Klik badge pada tanggal untuk mengganti status secara cepat, atau klik tanggal untuk rincian lengkap.
          </div>
        </div>
      </div>

      {/* Selected Day Detail & Edit Modal */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Atur Jadwal: {selectedDayData.dayNumber} {monthNames[selectedDayData.month - 1]} {selectedDayData.year}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hari {dayNames[selectedDayData.dayOfWeek]} {selectedDayData.isHoliday ? `• ${selectedDayData.holidayName}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Perusahaan A Configuration */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  {companyA.companyName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                  {companyA.salaryBasis === 'monthly' ? 'Bulanan' : 'Daily Rate'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Status Kehadiran Hari Ini:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['work', 'half_day', 'overtime', 'leave', 'sick', 'off'] as WorkStatus[]).map((st) => {
                    const meta = WORK_STATUS_META[st];
                    const isCur = selectedDayData.assignments.company_a?.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const updated: WorkScheduleDay = {
                            ...selectedDayData,
                            assignments: {
                              ...selectedDayData.assignments,
                              company_a: {
                                ...(selectedDayData.assignments.company_a || {}),
                                status: st,
                                shiftName: st === 'work' ? 'Masuk' : st === 'half_day' ? '1/2 Hari' : st === 'off' ? 'Libur' : st,
                              },
                            },
                          };
                          onUpdateScheduleDay(selectedDate, updated);
                        }}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                          isCur
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {meta.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Jam Lembur (Overtime):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="16"
                    value={selectedDayData.assignments.company_a?.overtimeHours || 0}
                    onChange={(e) => {
                      const ot = Number(e.target.value) || 0;
                      onUpdateScheduleDay(selectedDate, {
                        ...selectedDayData,
                        assignments: {
                          ...selectedDayData.assignments,
                          company_a: {
                            ...(selectedDayData.assignments.company_a || { status: 'work' }),
                            overtimeHours: ot,
                          },
                        },
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Catatan Shift / Proyek:
                  </label>
                  <input
                    type="text"
                    placeholder="cth: Shift Pagi / Project X"
                    value={selectedDayData.assignments.company_a?.notes || ''}
                    onChange={(e) => {
                      onUpdateScheduleDay(selectedDate, {
                        ...selectedDayData,
                        assignments: {
                          ...selectedDayData.assignments,
                          company_a: {
                            ...(selectedDayData.assignments.company_a || { status: 'work' }),
                            notes: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Perusahaan B Configuration */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  {companyB.companyName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono">
                  {companyB.salaryBasis === 'monthly' ? 'Bulanan' : 'Daily Rate'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Status Kehadiran Hari Ini:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['work', 'half_day', 'overtime', 'leave', 'sick', 'off'] as WorkStatus[]).map((st) => {
                    const meta = WORK_STATUS_META[st];
                    const isCur = selectedDayData.assignments.company_b?.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const updated: WorkScheduleDay = {
                            ...selectedDayData,
                            assignments: {
                              ...selectedDayData.assignments,
                              company_b: {
                                ...(selectedDayData.assignments.company_b || {}),
                                status: st,
                                shiftName: st === 'work' ? 'Masuk' : st === 'half_day' ? '1/2 Hari' : st === 'off' ? 'Libur' : st,
                              },
                            },
                          };
                          onUpdateScheduleDay(selectedDate, updated);
                        }}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                          isCur
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {meta.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Jam Lembur (Overtime):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="16"
                    value={selectedDayData.assignments.company_b?.overtimeHours || 0}
                    onChange={(e) => {
                      const ot = Number(e.target.value) || 0;
                      onUpdateScheduleDay(selectedDate, {
                        ...selectedDayData,
                        assignments: {
                          ...selectedDayData.assignments,
                          company_b: {
                            ...(selectedDayData.assignments.company_b || { status: 'work' }),
                            overtimeHours: ot,
                          },
                        },
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Catatan Shift / Proyek:
                  </label>
                  <input
                    type="text"
                    placeholder="cth: Project Sprint / Harian"
                    value={selectedDayData.assignments.company_b?.notes || ''}
                    onChange={(e) => {
                      onUpdateScheduleDay(selectedDate, {
                        ...selectedDayData,
                        assignments: {
                          ...selectedDayData.assignments,
                          company_b: {
                            ...(selectedDayData.assignments.company_b || { status: 'work' }),
                            notes: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Selesai & Simpan Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
