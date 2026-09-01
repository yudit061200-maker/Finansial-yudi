import React, { useState, useEffect } from 'react';
import {
  CompanySalaryProfile,
  EmploymentType,
  PtkpStatus,
  BadgeColor,
} from '../types/salary';
import { BADGE_COLOR_MAP } from '../utils/scheduleHelper';
import { calculateSalary } from '../utils/salaryCalculator';
import { formatRupiah } from '../utils/formatters';
import {
  X,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Check,
  Clock,
  Receipt,
  HelpCircle,
  TrendingUp,
  Percent,
  Copy,
} from 'lucide-react';

interface CompanySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CompanySalaryProfile | null;
  onSave: (company: CompanySalaryProfile) => void;
  onDelete?: (companyId: string) => void;
  onDuplicate?: (company: CompanySalaryProfile) => void;
  canDelete?: boolean;
}

const AVAILABLE_COLORS: BadgeColor[] = [
  'indigo',
  'emerald',
  'amber',
  'cyan',
  'purple',
  'rose',
  'blue',
  'teal',
  'orange',
];

export const CompanySalaryModal: React.FC<CompanySalaryModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  onDelete,
  onDuplicate,
  canDelete = false,
}) => {
  const isEditing = !!initialData;

  const [activeTab, setActiveTab] = useState<'income' | 'tax_bpjs' | 'cutoff_deductions'>('income');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [nameError, setNameError] = useState('');

  // Form State
  const [formData, setFormData] = useState<CompanySalaryProfile>({
    id: 'comp_' + Date.now(),
    companyName: '',
    jobTitle: '',
    badgeColor: 'indigo',
    employmentType: 'permanent',
    baseSalary: 10000000,
    dailyRate: 150000,
    standardWorkingDays: 22,
    isProratedBaseSalary: false,
    isDailyTransport: true,
    dailyTransportRate: 50000,
    fixedAllowance: 1500000,
    transportAllowance: 0,
    otherAllowance: 0,
    overtimeHours: 0,
    overtimeRatePerHour: 0,
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
    deductionNotes: '',
    cutOffConfig: {
      cutOffDay: 20,
      payDay: 25,
    },
    notes: '',
  });

  useEffect(() => {
    setIsConfirmingDelete(false);
    setNameError('');
    if (initialData) {
      setFormData({
        ...initialData,
        // ensure default safe values
        baseSalary: initialData.baseSalary ?? 0,
        dailyRate: initialData.dailyRate ?? 0,
        standardWorkingDays: initialData.standardWorkingDays || 22,
        cutOffConfig: {
          cutOffDay: initialData.cutOffConfig?.cutOffDay ?? 20,
          payDay: initialData.cutOffConfig?.payDay ?? 25,
        },
      });
    } else {
      setFormData({
        id: 'comp_' + Date.now(),
        companyName: '',
        jobTitle: '',
        badgeColor: 'indigo',
        employmentType: 'permanent',
        baseSalary: 8000000,
        dailyRate: 150000,
        standardWorkingDays: 22,
        isProratedBaseSalary: false,
        isDailyTransport: true,
        dailyTransportRate: 40000,
        fixedAllowance: 1000000,
        transportAllowance: 0,
        otherAllowance: 0,
        overtimeHours: 0,
        overtimeRatePerHour: 0,
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
        deductionNotes: '',
        cutOffConfig: {
          cutOffDay: 20,
          payDay: 25,
        },
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  // Live simulation of calculation
  const simulationResult = React.useMemo(() => {
    return calculateSalary({
      employeeName: 'Simulasi Karyawan',
      companyId: formData.id,
      companyName: formData.companyName || 'Perusahaan',
      jobTitle: formData.jobTitle || 'Posisi',
      employmentType: formData.employmentType,
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      ptkpStatus: formData.ptkpStatus,
      hasNpwp: formData.hasNpwp,
      baseSalary: formData.baseSalary || 0,
      dailyRate: formData.dailyRate || 0,
      standardWorkingDays: formData.standardWorkingDays || 22,
      actualWorkingDays: formData.standardWorkingDays || 22,
      isProratedBaseSalary: formData.isProratedBaseSalary,
      isDailyTransport: formData.isDailyTransport,
      dailyTransportRate: formData.dailyTransportRate || 0,
      fixedAllowance: formData.fixedAllowance || 0,
      transportAllowance: formData.transportAllowance || 0,
      otherAllowance: formData.otherAllowance || 0,
      overtimeHours: formData.overtimeHours || 0,
      overtimeRatePerHour: formData.overtimeRatePerHour || 0,
      bonusOrThr: formData.bonusOrThr || 0,
      includeBpjsKesehatan: formData.includeBpjsKesehatan,
      includeBpjsKetenagakerjaan: formData.includeBpjsKetenagakerjaan,
      calculatePph21: formData.calculatePph21,
      taxMethod: formData.taxMethod,
      loanOrCashAdvance: formData.loanOrCashAdvance || 0,
      absenceDeduction: formData.absenceDeduction || 0,
      cooperativeFee: formData.cooperativeFee || 0,
      otherDeduction: formData.otherDeduction || 0,
    });
  }, [formData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setNameError('Silakan masukkan nama perusahaan atau tempat kerja.');
      setActiveTab('income');
      return;
    }
    onSave(formData);
    onClose();
  };

  const currentColorMeta = BADGE_COLOR_MAP[formData.badgeColor] || BADGE_COLOR_MAP.indigo;

  return (
    <div
      id="modal-company-salary-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="modal-company-salary-container"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${currentColorMeta.bg} ${currentColorMeta.text} border ${currentColorMeta.border}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isEditing ? 'Edit Data Gaji Perusahaan' : 'Tambah Perusahaan Baru'}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${currentColorMeta.bg} ${currentColorMeta.text} border ${currentColorMeta.border}`}>
                  {formData.companyName || 'Nama Perusahaan'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasi sistem penggajian: <strong>Gaji Pokok + Daily Rate (Upah Harian)</strong>, tunjangan, cut-off, BPJS & PPh 21.
              </p>
            </div>
          </div>
          <button
            id="btn-close-company-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/40 dark:bg-slate-900/30 gap-2 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'income'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            1. Gaji Pokok, Daily Rate & Tunjangan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cutoff_deductions')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'cutoff_deductions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            2. Tanggal Cut-Off, Lembur & Potongan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax_bpjs')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'tax_bpjs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            3. BPJS & Pajak PPh 21 TER
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity & Badge Row (Always Visible) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Perusahaan / Klien <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-company-name"
                  type="text"
                  required
                  placeholder="Contoh: PT Bank Mandiri / CV Inovasi Digital"
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value });
                    if (nameError) setNameError('');
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border ${
                    nameError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                  } rounded-lg focus:ring-2 text-slate-900 dark:text-white`}
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              {nameError && (
                <p className="text-[11px] text-rose-500 font-medium">{nameError}</p>
              )}
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Posisi / Jabatan
              </label>
              <div className="relative">
                <input
                  id="input-job-title"
                  type="text"
                  placeholder="Contoh: IT Consultant / Fullstack Dev"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
                />
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Warna Label / Badge
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {AVAILABLE_COLORS.map((col) => {
                  const meta = BADGE_COLOR_MAP[col];
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData({ ...formData, badgeColor: col })}
                      className={`w-6 h-6 rounded-full ${meta.dot} transition-transform ${
                        formData.badgeColor === col
                          ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={`Pilih warna ${col}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB 1: Income (Gaji Pokok + Daily Rate + Tunjangan) */}
          {activeTab === 'income' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Highlight Banner: Sistem Gaji Pokok + Daily Rate */}
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Formula Penggajian Fleksibel:</strong> Total Komponen Pokok dihitung otomatis dari{' '}
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    Gaji Pokok + (Daily Rate × Hari Masuk Aktual)
                  </span>
                  . Anda dapat mengisi keduanya sekaligus, atau hanya salah satu (set 0 jika tidak ada).
                </p>
              </div>

              {/* Core Income Grid: Base Salary & Daily Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Gaji Pokok (Bulanan Dasar) */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-indigo-600" />
                      Gaji Pokok (Base Salary)
                    </label>
                    <span className="text-[11px] text-slate-400">Nominal Tetap Bulanan</span>
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        id="input-base-salary"
                        type="number"
                        min="0"
                        step="10000"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) || 0 })}
                        className="w-full pl-10 pr-3 py-2 text-sm font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      {formatRupiah(formData.baseSalary)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <label htmlFor="toggle-prorate" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      Prorata jika kehadiran kurang
                    </label>
                    <input
                      id="toggle-prorate"
                      type="checkbox"
                      checked={formData.isProratedBaseSalary}
                      onChange={(e) => setFormData({ ...formData, isProratedBaseSalary: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 2. Daily Rate (Upah Harian) */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Daily Rate (Upah per Hari Masuk)
                    </label>
                    <span className="text-[11px] text-slate-400">Dikalikan Hari Hadir</span>
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        id="input-daily-rate"
                        type="number"
                        min="0"
                        step="5000"
                        value={formData.dailyRate}
                        onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) || 0 })}
                        className="w-full pl-10 pr-3 py-2 text-sm font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      {formatRupiah(formData.dailyRate)} / hari masuk
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-[11px] text-slate-500 dark:text-slate-400">Target Hari Standar</label>
                      <input
                        id="input-standard-days"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.standardWorkingDays}
                        onChange={(e) => setFormData({ ...formData, standardWorkingDays: Number(e.target.value) || 22 })}
                        className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] text-slate-400">Estimasi Upah Harian:</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        {formatRupiah(formData.dailyRate * formData.standardWorkingDays)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipe Pekerjaan Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tipe Kontrak</label>
                  <select
                    id="select-employment-type"
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="permanent">Karyawan Tetap (PKWTT)</option>
                    <option value="contract">Karyawan Kontrak (PKWT)</option>
                    <option value="freelance">Freelance / Proyek</option>
                    <option value="shift">Shift / Part-Time / Side Job</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tunjangan Tetap / Jabatan</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">Rp</span>
                    <input
                      id="input-fixed-allowance"
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.fixedAllowance}
                      onChange={(e) => setFormData({ ...formData, fixedAllowance: Number(e.target.value) || 0 })}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tunjangan Lainnya</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">Rp</span>
                    <input
                      id="input-other-allowance"
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.otherAllowance}
                      onChange={(e) => setFormData({ ...formData, otherAllowance: Number(e.target.value) || 0 })}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tunjangan Transport / Makan (Daily vs Fixed) */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tunjangan Uang Makan & Transportasi
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih apakah dihitung berdasarkan absensi harian atau flat bulanan
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isDailyTransport: true })}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                        formData.isDailyTransport
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Harian (Per Hadir)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isDailyTransport: false })}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                        !formData.isDailyTransport
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Flat Bulanan
                    </button>
                  </div>
                </div>

                {formData.isDailyTransport ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">Rp</span>
                      <input
                        id="input-daily-transport-rate"
                        type="number"
                        min="0"
                        step="5000"
                        value={formData.dailyTransportRate}
                        onChange={(e) => setFormData({ ...formData, dailyTransportRate: Number(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        placeholder="Tarif uang makan/transport per hari"
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      = {formatRupiah(formData.dailyTransportRate * formData.standardWorkingDays)} / bln (est. {formData.standardWorkingDays} hari)
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">Rp</span>
                    <input
                      id="input-flat-transport-allowance"
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.transportAllowance}
                      onChange={(e) => setFormData({ ...formData, transportAllowance: Number(e.target.value) || 0 })}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="Nominal tunjangan transport flat sebulan"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Cut-Off, Overtime & Deductions */}
          {activeTab === 'cutoff_deductions' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Cut-Off Config Card */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Siklus Tanggal Tutup Penghitungan (Cut-Off Period)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tanggal Cut-Off (Tutup Buku Presensi)
                    </label>
                    <select
                      id="select-cutoff-day"
                      value={formData.cutOffConfig.cutOffDay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cutOffConfig: { ...formData.cutOffConfig, cutOffDay: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="20">Tanggal 20 (Periode 21 bln lalu s.d 20 bln ini)</option>
                      <option value="25">Tanggal 25 (Periode 26 bln lalu s.d 25 bln ini)</option>
                      <option value="28">Tanggal 28 (Periode 29 bln lalu s.d 28 bln ini)</option>
                      <option value="31">Akhir Bulan (1 s.d Akhir Bulan Penuh)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Kehadiran dari kalender akan dihitung otomatis sesuai rentang cut-off ini.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tanggal Gajian (Pay Day)
                    </label>
                    <select
                      id="select-pay-day"
                      value={formData.cutOffConfig.payDay || 25}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cutOffConfig: { ...formData.cutOffConfig, payDay: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="25">Tanggal 25 tiap bulan</option>
                      <option value="28">Tanggal 28 tiap bulan</option>
                      <option value="30">Tanggal 30 / Akhir bulan</option>
                      <option value="1">Tanggal 1 bulan berikutnya</option>
                      <option value="5">Tanggal 5 bulan berikutnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lembur & Bonus Project Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Pengaturan Lembur & Bonus Tambahan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Jam Lembur Default</label>
                    <input
                      id="input-overtime-hours"
                      type="number"
                      min="0"
                      value={formData.overtimeHours}
                      onChange={(e) => setFormData({ ...formData, overtimeHours: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      placeholder="Jam"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tarif Lembur/Jam (0 = Auto 1/173)</label>
                    <input
                      id="input-overtime-rate"
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.overtimeRatePerHour}
                      onChange={(e) => setFormData({ ...formData, overtimeRatePerHour: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Bonus / THR / Insentif</label>
                    <input
                      id="input-bonus-thr"
                      type="number"
                      min="0"
                      step="50000"
                      value={formData.bonusOrThr}
                      onChange={(e) => setFormData({ ...formData, bonusOrThr: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Potongan Kasbon & Pinjaman */}
              <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  Potongan Karyawan & Kasbon
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Kasbon / Pinjaman</label>
                    <input
                      id="input-loan"
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.loanOrCashAdvance}
                      onChange={(e) => setFormData({ ...formData, loanOrCashAdvance: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Potongan Terlambat</label>
                    <input
                      id="input-absence"
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.absenceDeduction}
                      onChange={(e) => setFormData({ ...formData, absenceDeduction: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Iuran Koperasi / Duka</label>
                    <input
                      id="input-coop"
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.cooperativeFee}
                      onChange={(e) => setFormData({ ...formData, cooperativeFee: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Potongan Lainnya</label>
                    <input
                      id="input-other-deduction"
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.otherDeduction}
                      onChange={(e) => setFormData({ ...formData, otherDeduction: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Tax & BPJS */}
          {activeTab === 'tax_bpjs' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* BPJS Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Jaminan Sosial BPJS</h4>
                      <p className="text-[11px] text-slate-500">Iuran Kesehatan (1%) & Ketenagakerjaan JHT (2%) + JP (1%)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                    <input
                      id="toggle-bpjs-kes"
                      type="checkbox"
                      checked={formData.includeBpjsKesehatan}
                      onChange={(e) => setFormData({ ...formData, includeBpjsKesehatan: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        BPJS Kesehatan (1% Pekerja)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        4% ditanggung perusahaan, plafon gaji maks Rp 12.000.000
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                    <input
                      id="toggle-bpjs-tk"
                      type="checkbox"
                      checked={formData.includeBpjsKetenagakerjaan}
                      onChange={(e) => setFormData({ ...formData, includeBpjsKetenagakerjaan: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        BPJS TK (JHT 2% & JP 1%)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Perusahaan cover JHT 3.7%, JP 2%, JKK 0.24%, JKM 0.3%
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* PPh 21 TER Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Pajak Penghasilan PPh 21 TER (PP 58/2023)
                      </h4>
                      <p className="text-[11px] text-slate-500">Tarif Efektif Rata-rata A, B, atau C</p>
                    </div>
                  </div>
                  <input
                    id="toggle-pph21"
                    type="checkbox"
                    checked={formData.calculatePph21}
                    onChange={(e) => setFormData({ ...formData, calculatePph21: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                </div>

                {formData.calculatePph21 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Status PTKP</label>
                      <select
                        id="select-ptkp"
                        value={formData.ptkpStatus}
                        onChange={(e) => setFormData({ ...formData, ptkpStatus: e.target.value as PtkpStatus })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="TK/0">TK/0 (Lajang 0 Tanggungan - Kat A)</option>
                        <option value="TK/1">TK/1 (Lajang 1 Tanggungan - Kat A)</option>
                        <option value="TK/2">TK/2 (Lajang 2 Tanggungan - Kat B)</option>
                        <option value="TK/3">TK/3 (Lajang 3 Tanggungan - Kat B)</option>
                        <option value="K/0">K/0 (Menikah 0 Tanggungan - Kat A)</option>
                        <option value="K/1">K/1 (Menikah 1 Tanggungan - Kat B)</option>
                        <option value="K/2">K/2 (Menikah 2 Tanggungan - Kat B)</option>
                        <option value="K/3">K/3 (Menikah 3 Tanggungan - Kat C)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Metode Pemotongan</label>
                      <select
                        id="select-tax-method"
                        value={formData.taxMethod}
                        onChange={(e) => setFormData({ ...formData, taxMethod: e.target.value as 'gross' | 'gross_up' | 'nett' })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="gross">Gross (Dipotong dari gaji karyawan)</option>
                        <option value="gross_up">Gross-Up (Diberi tunjangan pajak)</option>
                        <option value="nett">Nett (Ditanggung penuh perusahaan)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          id="toggle-npwp"
                          type="checkbox"
                          checked={formData.hasNpwp}
                          onChange={(e) => setFormData({ ...formData, hasNpwp: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                        />
                        Memiliki NPWP / NIK Valid
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Estimator Footer inside Modal */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 w-full sm:w-auto text-left">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Pokok (Est.)</span>
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {formatRupiah(simulationResult.totalBasicIncome)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Gaji Bruto</span>
                <span className="text-xs font-mono font-semibold text-amber-400">
                  {formatRupiah(simulationResult.grossSalary)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Est. Take Home Pay</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {formatRupiah(simulationResult.netSalary)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-right sm:max-w-xs">
              Potongan: BPJS {formatRupiah(simulationResult.bpjs.totalEmployeeBpjs)} + Pajak {formatRupiah(simulationResult.pph21.monthlyPph21)}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {isEditing && canDelete && onDelete && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl animate-in fade-in">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 px-1">
                      Hapus {formData.companyName || 'perusahaan ini'}?
                    </span>
                    <button
                      id="btn-confirm-delete-company"
                      type="button"
                      onClick={() => {
                        onDelete(formData.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      id="btn-cancel-delete-company"
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-delete-company"
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus Perusahaan
                  </button>
                )
              )}

              {isEditing && onDuplicate && !isConfirmingDelete && (
                <button
                  id="btn-duplicate-company"
                  type="button"
                  onClick={() => {
                    onDuplicate(formData);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  Duplikat Data
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                id="btn-cancel-company-modal"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-save-company-modal"
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isEditing ? 'Simpan Perubahan' : 'Tambah Perusahaan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
