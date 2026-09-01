import React, { useState, useMemo } from 'react';
import {
  WorkScheduleDay,
  WorkStatus,
  CompanySalaryProfile,
  DayCompanyAssignment,
} from '../types/salary';
import {
  getCutOffDateRange,
  getOrConstructDaySchedule,
  calculateCompanyScheduleAttendance,
  INDONESIAN_HOLIDAYS,
  WORK_STATUS_META,
  BADGE_COLOR_MAP,
} from '../utils/scheduleHelper';
import { formatRupiah, getTodayDateString } from '../utils/formatters';
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
  Sliders,
  Info,
  Zap,
  Edit,
  DollarSign,
  ChevronDown,
} from 'lucide-react';

interface WorkScheduleCalendarProps {
  year: number;
  month: number; // 1 - 12
  onYearMonthChange: (year: number, month: number) => void;
  companies: CompanySalaryProfile[];
  onUpdateCompanyProfile: (companyId: string, updated: Partial<CompanySalaryProfile>) => void;
  onEditCompanyModal?: (company: CompanySalaryProfile) => void;
  onAddCompanyModal?: () => void;
  schedules: Record<string, WorkScheduleDay>;
  onUpdateScheduleDay: (dateStr: string, dayData: WorkScheduleDay) => void;
  onBatchUpdateSchedules: (updates: Record<string, WorkScheduleDay>) => void;
  isPrivacyMode?: boolean;
}

export const WorkScheduleCalendar: React.FC<WorkScheduleCalendarProps> = ({
  year,
  month,
  onYearMonthChange,
  companies,
  onUpdateCompanyProfile,
  onEditCompanyModal,
  onAddCompanyModal,
  schedules,
  onUpdateScheduleDay,
  onBatchUpdateSchedules,
  isPrivacyMode = false,
}) => {
  // Calendar View Mode: 'cutoff' (Sesuai tanggal tutup) or 'full_month' (1 s.d akhir bulan)
  const [calendarViewMode, setCalendarViewMode] = useState<'cutoff' | 'full_month'>('cutoff');
  
  // Selected Company filter: 'all' or company.id
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<string>('all');

  // Selected Day for Detail Modal / Popover
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Current selected company object if filtered
  const activeCompany = companies.find((c) => c.id === activeCompanyFilter) || companies[0] || null;

  // Primary cut-off range to display
  const primaryCutOff = useMemo(() => {
    const cutOffDay = activeCompany ? activeCompany.cutOffConfig.cutOffDay : 20;
    return getCutOffDateRange(year, month, cutOffDay);
  }, [year, month, activeCompany]);

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

  // Helper to get or construct schedule day for all active companies
  const getDaySchedule = (dateStr: string, _dayNum?: number, _m?: number, _y?: number): WorkScheduleDay => {
    return getOrConstructDaySchedule(dateStr, schedules, companies);
  };

  // Calculate statistics per company within its own cut-off dates
  const calculateAttendance = (company: CompanySalaryProfile) => {
    const cutOff = getCutOffDateRange(year, month, company.cutOffConfig.cutOffDay);
    const stats = calculateCompanyScheduleAttendance(company.id, schedules, cutOff.dateList, companies);
    return {
      ...stats,
      cutOff,
    };
  };

  // Batch Patterns
  const applyStandardPattern = (pattern: 'senin_jumat' | 'weekend_shift' | 'all_work' | 'all_off') => {
    const newUpdates: Record<string, WorkScheduleDay> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, d);
      const dayOfWeek = dObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = !!INDONESIAN_HOLIDAYS[dateStr];

      const current = getDaySchedule(dateStr, d, month, year);
      const newAssignments = { ...current.assignments };

      companies.forEach((comp, idx) => {
        // If filtering a specific company, only apply to that company
        if (activeCompanyFilter !== 'all' && activeCompanyFilter !== comp.id) {
          return;
        }

        if (pattern === 'senin_jumat') {
          newAssignments[comp.id] = {
            status: isWeekend || isHoliday ? 'off' : 'work',
            shiftName: isWeekend || isHoliday ? 'Libur' : 'Kerja',
            overtimeHours: 0,
          };
        } else if (pattern === 'weekend_shift') {
          newAssignments[comp.id] = {
            status: isWeekend ? 'work' : 'off',
            shiftName: isWeekend ? 'Kerja Weekend' : 'Libur',
            overtimeHours: 0,
          };
        } else if (pattern === 'all_work') {
          newAssignments[comp.id] = { status: 'work', shiftName: 'Kerja', overtimeHours: 0 };
        } else if (pattern === 'all_off') {
          newAssignments[comp.id] = { status: 'off', shiftName: 'Libur', overtimeHours: 0 };
        }
      });

      newUpdates[dateStr] = {
        ...current,
        assignments: newAssignments,
      };
    }

    onBatchUpdateSchedules(newUpdates);
  };

  // Quick toggle status for a specific company: Toggle between 'work' and 'off'
  const handleQuickToggle = (dateStr: string, companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const parts = dateStr.split('-').map(Number);
    const day = getDaySchedule(dateStr, parts[2], parts[1], parts[0]);
    const currAssignment = day.assignments[companyId] || { status: 'off', overtimeHours: 0 };

    const nextStatus: WorkStatus = currAssignment.status === 'work' ? 'off' : 'work';

    const updated: WorkScheduleDay = {
      ...day,
      assignments: {
        ...day.assignments,
        [companyId]: {
          ...currAssignment,
          status: nextStatus,
          shiftName: nextStatus === 'work' ? 'Kerja' : 'Libur',
        },
      },
    };

    onUpdateScheduleDay(dateStr, updated);
  };

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
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Kalender Jadwal Masuk & Tutup Penghitungan (Cut-Off)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    {companies.length} Perusahaan Terdaftar
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik tanggal untuk atur kehadiran kerja, libur, dan jam lembur.
                </p>
              </div>
            </div>
          </div>

          {/* Month Navigator & Company Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onAddCompanyModal && (
              <button
                id="btn-add-company-schedule-top"
                type="button"
                onClick={onAddCompanyModal}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Perusahaan
              </button>
            )}

            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                id="btn-prev-month"
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[130px] text-center font-mono">
                {monthNames[month - 1]} {year}
              </div>
              <button
                id="btn-next-month"
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Company Filter Tabs & Quick Settings */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Perusahaan Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 mr-1">Tampilkan:</span>
            <button
              id="filter-company-all"
              type="button"
              onClick={() => setActiveCompanyFilter('all')}
              className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                activeCompanyFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua Perusahaan ({companies.length})
            </button>

            {companies.map((comp) => {
              const meta = BADGE_COLOR_MAP[comp.badgeColor] || BADGE_COLOR_MAP.indigo;
              const isSelected = activeCompanyFilter === comp.id;
              return (
                <div key={comp.id} className="flex items-center gap-1">
                  <button
                    id={`filter-company-${comp.id}`}
                    type="button"
                    onClick={() => setActiveCompanyFilter(comp.id)}
                    className={`px-3 py-1 text-xs rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${meta.pill} shadow-sm`
                        : `${meta.bg} ${meta.text} border ${meta.border} opacity-80 hover:opacity-100`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                    <span className="max-w-[140px] truncate">{comp.companyName}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      (Tgl {comp.cutOffConfig.cutOffDay})
                    </span>
                  </button>

                  {onEditCompanyModal && (
                    <button
                      type="button"
                      onClick={() => onEditCompanyModal(comp)}
                      title={`Edit data gaji ${comp.companyName}`}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Batch Pattern Shortcut Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Pola Cepat:</span>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => applyStandardPattern('senin_jumat')}
                className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                title="Senin-Jumat Masuk, Weekend Libur"
              >
                Senin–Jum
              </button>
              <button
                type="button"
                onClick={() => applyStandardPattern('weekend_shift')}
                className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                title="Khusus Sabtu-Minggu Masuk"
              >
                Weekend
              </button>
              <button
                type="button"
                onClick={() => applyStandardPattern('all_work')}
                className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                title="Semua Hari Masuk"
              >
                Semua Masuk
              </button>
              <button
                type="button"
                onClick={() => applyStandardPattern('all_off')}
                className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-medium transition-colors"
                title="Reset Semua Libur"
              >
                Reset Libur
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Summary Cards per Company (Attendance & Cut-off Range) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((comp) => {
          const stats = calculateAttendance(comp);
          const meta = BADGE_COLOR_MAP[comp.badgeColor] || BADGE_COLOR_MAP.indigo;

          // Estimated earnings for this company: Gaji Pokok + (Daily Rate * actualWorkingDays) + Tunjangan Harian
          const computedBase = comp.baseSalary || 0;
          const computedDaily = (comp.dailyRate || 0) * stats.actualWorkingDays;
          const computedTransport = comp.isDailyTransport ? (comp.dailyTransportRate || 0) * stats.actualWorkingDays : comp.transportAllowance;
          const estGross = computedBase + computedDaily + computedTransport + (comp.fixedAllowance || 0) + (comp.otherAllowance || 0);

          return (
            <div
              key={comp.id}
              className={`p-4 rounded-3xl border transition-all ${
                activeCompanyFilter === comp.id || activeCompanyFilter === 'all'
                  ? `bg-white dark:bg-slate-900 ${meta.border} shadow-sm`
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${meta.dot}`}></span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                      {comp.companyName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{comp.jobTitle || 'Posisi'}</p>
                  </div>
                </div>
                {onEditCompanyModal && (
                  <button
                    type="button"
                    onClick={() => onEditCompanyModal(comp)}
                    className="p-1.5 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Cut-Off Cycle Badge */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 mb-3 text-xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Siklus Tutup Buku:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {comp.cutOffConfig.cutOffDay === 15
                      ? 'Tgl 15 (Periode 16–15)'
                      : comp.cutOffConfig.cutOffDay >= 31
                      ? 'Akhir Bulan (1–Akhir)'
                      : `Tgl ${comp.cutOffConfig.cutOffDay} (Periode ${comp.cutOffConfig.cutOffDay + 1}–${comp.cutOffConfig.cutOffDay})`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-400 text-[10px]">Rentang:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[10px]">
                    {stats.cutOff.startDisplay} – {stats.cutOff.endDisplay}
                  </span>
                </div>
              </div>

              {/* Attendance Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">Hari Kerja</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {stats.actualWorkingDays}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block font-medium">Hari Libur</span>
                  <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {stats.offDays}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">Lembur</span>
                  <span className="text-base font-bold text-amber-700 dark:text-amber-300 font-mono">
                    {stats.overtimeHours}j
                  </span>
                </div>
              </div>

              {/* Pay Estimation Bar (Gaji Pokok + Daily Rate) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">Estimasi Bruto:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {isPrivacyMode ? 'Rp ••••••••' : formatRupiah(estGross)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Calendar Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Status Kehadiran:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">Kerja (Masuk)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">Libur (Off)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Tip: <strong>Klik badge</strong> untuk ganti status Kerja/Libur cepat, atau <strong>klik kartu tanggal</strong> untuk atur jam lembur & catatan.
          </div>
        </div>

        {/* Day Header Row */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 py-1">
          {dayNames.map((d, i) => (
            <div key={d} className={i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days Cells Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] p-2 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent opacity-30"
            />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = getDaySchedule(dateStr, dayNum, month, year);
            const dObj = new Date(year, month - 1, dayNum);
            const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
            const isHoliday = !!dayData.holidayName;
            const isToday = getTodayDateString() === dateStr;

            return (
              <div
                key={`ws-day-${dateStr}-${i}`}
                id={`calendar-day-${dateStr}`}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:border-indigo-400 dark:hover:border-indigo-500 ${
                  isToday
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-sm'
                    : isHoliday || isWeekend
                    ? 'bg-rose-50/20 dark:bg-rose-950/10 border-slate-200/80 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold font-mono ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                        : isHoliday || isWeekend
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isHoliday && (
                    <span
                      className="text-[9px] text-rose-600 dark:text-rose-400 truncate max-w-[65px] font-medium"
                      title={dayData.holidayName}
                    >
                      Libur
                    </span>
                  )}
                </div>

                {/* Badges for Companies */}
                <div className="space-y-1 my-auto">
                  {companies
                    .filter((c) => activeCompanyFilter === 'all' || activeCompanyFilter === c.id)
                    .map((comp) => {
                      const assignment = dayData.assignments[comp.id] || { status: 'off', overtimeHours: 0 };
                      const statusMeta = WORK_STATUS_META[assignment.status] || WORK_STATUS_META.off;
                      const compColor = BADGE_COLOR_MAP[comp.badgeColor] || BADGE_COLOR_MAP.indigo;

                      return (
                        <div
                          key={comp.id}
                          onClick={(e) => handleQuickToggle(dateStr, comp.id, e)}
                          title={`${comp.companyName}: ${statusMeta.label}${assignment.overtimeHours ? ` (Lembur ${assignment.overtimeHours} jam)` : ''}. Klik untuk ganti status.`}
                          className={`px-1.5 py-0.5 rounded-lg border text-[10px] font-semibold flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] ${statusMeta.bgColor} ${statusMeta.textColor} ${statusMeta.borderColor}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${compColor.dot} shrink-0`}></span>
                            <span className="truncate max-w-[55px]">{comp.companyName.split(' ')[0]}</span>
                          </div>
                          <span className="font-mono text-[9px] shrink-0 font-bold">
                            {statusMeta.shortLabel}
                            {assignment.overtimeHours ? ` +${assignment.overtimeHours}j` : ''}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Footer notes indicator if any */}
                <div className="text-[9px] text-slate-400 truncate pt-1">
                  {Object.values(dayData.assignments).find((a) => a.notes)?.notes || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail & Schedule Assignment Modal */}
      {selectedDate && selectedDayData && (
        <div
          id="modal-date-detail-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            id="modal-date-detail-content"
            className="w-full max-w-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Atur Presensi: {selectedDayData.dayNumber} {monthNames[selectedDayData.month - 1]} {selectedDayData.year}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDayData.holidayName ? `Hari Libur: ${selectedDayData.holidayName}` : 'Pilih status kerja dan lembur untuk setiap perusahaan.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* List of Companies Assignment Controls */}
            <div className="space-y-4">
              {companies.map((comp) => {
                const assignment = selectedDayData.assignments[comp.id] || { status: 'off', overtimeHours: 0 };
                const compColor = BADGE_COLOR_MAP[comp.badgeColor] || BADGE_COLOR_MAP.indigo;

                return (
                  <div
                    key={comp.id}
                    className={`p-4 rounded-2xl border ${compColor.bg} ${compColor.border} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-2 ${compColor.text}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${compColor.dot}`}></span>
                        {comp.companyName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        Pokok + Daily {formatRupiah(comp.dailyRate)}/hr
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Status Presensi Hari Ini:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated: WorkScheduleDay = {
                              ...selectedDayData,
                              assignments: {
                                ...selectedDayData.assignments,
                                [comp.id]: {
                                  ...assignment,
                                  status: 'work',
                                  shiftName: 'Kerja',
                                },
                              },
                            };
                            onUpdateScheduleDay(selectedDate, updated);
                          }}
                          className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            assignment.status === 'work' || assignment.status === 'overtime' || assignment.status === 'half_day'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <span>Kerja (Masuk)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const updated: WorkScheduleDay = {
                              ...selectedDayData,
                              assignments: {
                                ...selectedDayData.assignments,
                                [comp.id]: {
                                  ...assignment,
                                  status: 'off',
                                  shiftName: 'Libur',
                                },
                              },
                            };
                            onUpdateScheduleDay(selectedDate, updated);
                          }}
                          className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            assignment.status === 'off' || assignment.status === 'leave' || assignment.status === 'sick'
                              ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md ring-2 ring-slate-400'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                          <span>Libur (Off)</span>
                        </button>
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
                          value={assignment.overtimeHours || 0}
                          onChange={(e) => {
                            const ot = Number(e.target.value) || 0;
                            onUpdateScheduleDay(selectedDate, {
                              ...selectedDayData,
                              assignments: {
                                ...selectedDayData.assignments,
                                [comp.id]: {
                                  ...assignment,
                                  overtimeHours: ot,
                                },
                              },
                            });
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Catatan Shift / Proyek:
                        </label>
                        <input
                          type="text"
                          placeholder="cth: Shift Pagi / Project X"
                          value={assignment.notes || ''}
                          onChange={(e) => {
                            onUpdateScheduleDay(selectedDate, {
                              ...selectedDayData,
                              assignments: {
                                ...selectedDayData.assignments,
                                [comp.id]: {
                                  ...assignment,
                                  notes: e.target.value,
                                },
                              },
                            });
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
