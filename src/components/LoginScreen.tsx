import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
  ArrowRight,
  TrendingUp,
  CreditCard,
  PieChart,
  Bot,
  Layers,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { login, register, quickLogin, allUsers, isCloudSynced } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Tab state: 'login' | 'register' | 'demo'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'demo'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Karyawan Swasta');
  const [regPhone, setRegPhone] = useState('');
  const [regAvatarColor, setRegAvatarColor] = useState('bg-indigo-600 text-white');

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorChoices = [
    { label: 'Indigo', class: 'bg-indigo-600 text-white' },
    { label: 'Emerald', class: 'bg-emerald-600 text-white' },
    { label: 'Sky', class: 'bg-sky-600 text-white' },
    { label: 'Violet', class: 'bg-violet-600 text-white' },
    { label: 'Rose', class: 'bg-rose-600 text-white' },
    { label: 'Amber', class: 'bg-amber-600 text-white' },
    { label: 'Teal', class: 'bg-teal-600 text-white' },
  ];

  const roleSuggestions = [
    'Karyawan Swasta',
    'Software Engineer',
    'Owner Bisnis / UMKM',
    'Freelancer & Creator',
    'PNS / Pegawai BUMN',
    'Mahasiswa',
    'Pengelola Keuangan Keluarga',
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Silakan masukkan email atau username Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });

      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg('Login berhasil! Membuka dashboard data keuangan...');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat proses masuk. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Mohon isi semua field wajib (Nama, Username, Email, Password).');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok dengan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        phone: regPhone.trim() || undefined,
        avatarColor: regAvatarColor,
      });

      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg('Akun berhasil dibuat! Membuka dashboard data keuangan...');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat mendaftar akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await quickLogin(userId);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg('Login berhasil! Membuka data keuangan...');
      }
    } catch {
      setErrorMsg('Gagal masuk dengan akun demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#080C14] bg-mesh-light dark:bg-mesh-dark transition-colors">
      {/* Background Decor Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-600/15 blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Branding & App Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-3 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Akses Terproteksi • Login Diperlukan</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-4 ring-white dark:ring-slate-800">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ArthaSmart <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Personal & Family Finance Management Platform
              </p>
            </div>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-indigo-950/10 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="grid grid-cols-3 p-1.5 m-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('demo');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Akun Demo</span>
            </button>
          </div>

          {/* Feedback messages */}
          <div className="px-6 pt-2">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="p-6 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email atau Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="yudit061200@gmail.com atau yudit"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default demo: <code className="text-indigo-600 dark:text-indigo-400 font-mono">yudit123</code>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>Ingat Saya di Perangkat Ini</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Pilih Akun Cepat →
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk & Buka Tampilan Data Web</span>
                  </>
                )}
              </button>

              {/* Quick Preset Hint */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Mau coba langsung tanpa mengetik?
                  </span>
                  <span className="text-[11px]">Gunakan fitur 1-klik pada tab Akun Demo.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(allUsers[0]?.id || 'user-yudit-01')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer"
                >
                  Masuk sbg Yudit
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="p-6 pt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Yudit Pratama"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username Unik *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="yudit / yudit_dev"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Konfirmasi Sandi *
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profesi / Bidang
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {roleSuggestions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Warna Avatar Akun
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorChoices.map((c) => (
                    <button
                      key={c.class}
                      type="button"
                      onClick={() => setRegAvatarColor(c.class)}
                      className={`w-7 h-7 rounded-full ${c.class.split(' ')[0]} flex items-center justify-center transition-transform cursor-pointer ${
                        regAvatarColor === c.class ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Menyimpan Akun...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Akun & Buka Tampilan Data</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: DEMO ACCOUNTS (1-CLICK QUICK ACCESS) */}
          {activeTab === 'demo' && (
            <div className="p-6 pt-4 space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Pilih salah satu profil demo di bawah ini untuk langsung masuk tanpa perlu mengisi kata sandi:
              </div>

              <div className="space-y-2.5">
                {allUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleQuickLogin(u.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${u.avatarColor || 'bg-indigo-600 text-white'} flex items-center justify-center font-black text-sm shadow-2xs group-hover:scale-105 transition-transform`}
                      >
                        {u.avatar || u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {u.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                            @{u.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Briefcase className="w-3 h-3" />
                          <span>{u.role || 'Pengguna'}</span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shrink-0">
                      <span>Masuk</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Security Note */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
              <span>Data User & Akun Tersimpan di Firebase Cloud</span>
              {isCloudSynced && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Tersinkronisasi Real-time" />
              )}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Mode {theme === 'dark' ? 'Terang' : 'Gelap'}
            </button>
          </div>
        </div>

        {/* Feature Teasers beneath card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-center">
            <CreditCard className="w-4 h-4 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Arus Kas & Saldo</span>
            <span className="text-[10px] text-slate-400">Rekening & E-Wallet</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-center">
            <PieChart className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Anggaran Pintar</span>
            <span className="text-[10px] text-slate-400">Target & Limit Bulanan</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-center">
            <Layers className="w-4 h-4 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Hutang & Piutang</span>
            <span className="text-[10px] text-slate-400">Jatuh Tempo & Cicilan</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-center">
            <Bot className="w-4 h-4 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">AI Financial Chat</span>
            <span className="text-[10px] text-slate-400">Analisis Keuangan Cerdas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
