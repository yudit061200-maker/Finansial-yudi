import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  Sparkles,
  KeyRound,
  Send,
  HelpCircle,
  Sun,
  Moon,
  Wallet,
  TrendingUp,
  CreditCard,
  LockKeyhole,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useAuth, AuthTab } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginGate: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginAnonymously,
    resetPassword,
    authError,
    setAuthError,
  } = useAuth();

  const { theme, toggleTheme } = useTheme();

  // Active view: 'login' | 'register' | 'forgot'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const firebaseConsoleUrl = 'https://console.firebase.google.com/project/fit-figure-r9v0l/authentication/providers';

  // Automatically open guide if operation-not-allowed is detected
  useEffect(() => {
    if (authError && (authError.includes('Firebase Console') || authError.includes('belum diaktifkan') || authError.includes('operation-not-allowed'))) {
      setShowFirebaseGuide(true);
    }
  }, [authError]);

  // Reset errors when switching tab
  useEffect(() => {
    setAuthError(null);
    setSuccessMessage(null);
  }, [activeTab, setAuthError]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Mohon isi alamat email dan password Anda.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      await loginWithEmail(email, password);
      // Auth state changes automatically in AuthContext, unlocking workspace
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Mohon isi alamat email dan password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password minimal harus 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      await registerWithEmail(email, password, displayName);
      setSuccessMessage('Akun berhasil dibuat! Mengalihkan ke dashboard...');
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Login
  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      await loginWithGoogle();
    } catch {
      // Handled in context
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Guest / Demo Login
  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      await loginAnonymously();
    } catch {
      // Handled in context
    } finally {
      setIsGuestLoading(false);
    }
  };

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(firebaseConsoleUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Forgot Password
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setAuthError('Masukkan alamat email Anda untuk menerima instruksi reset.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      await resetPassword(email);
      setSuccessMessage(`Link petunjuk reset password telah dikirim ke ${email}. Silakan cek email Anda.`);
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="login-gate-screen"
      className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200 dark:from-slate-950 dark:via-[#090e1a] dark:to-slate-900 flex flex-col justify-between text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-indigo-500 selection:text-white"
    >
      {/* Top Bar with Branding & Theme Switcher */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-sky-300 bg-clip-text text-transparent">
                ArthaSmart
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                Cloud v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Manajemen Keuangan Pribadi & Bisnis Terpadu
            </p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          id="btn-login-theme-toggle"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
          title={`Ganti ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </header>

      {/* Center Auth Card Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        
        {/* Left Side: Value Props & Security Assurance */}
        <div className="w-full lg:w-1/2 max-w-lg space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs">
            <LockKeyhole className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Akses Pengguna Web Terproteksi</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Masuk untuk Melihat Data Finansial Anda
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Demi menjaga privasi dan keamanan aset, seluruh catatan saldo, arus kas harian, hutang-piutang, serta kalkulasi gaji hanya dapat diakses setelah Anda masuk ke akun pengguna.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs flex items-start gap-3 text-left">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Akun Pengguna Web</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Masuk instan dengan nama/email & password</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs flex items-start gap-3 text-left">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Real-time Cloud Sync</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tersinkronisasi otomatis via Firestore</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Card */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-5 relative">
            
            {/* Tab Selector: Masuk / Daftar */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-full grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl">
                <button
                  id="tab-login-btn"
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Masuk Akun
                </button>
                <button
                  id="tab-register-btn"
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Daftar Baru
                </button>
              </div>
            </div>

            {/* Notification messages */}
            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{successMessage}</div>
              </div>
            )}

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{authError}</div>
                </div>

                {(authError.includes('Firebase Console') || authError.includes('belum diaktifkan') || authError.includes('operation-not-allowed')) && (
                  <button
                    type="button"
                    onClick={() => setShowFirebaseGuide(true)}
                    className="mt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 underline flex items-center gap-1 cursor-pointer hover:opacity-80"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Lihat Langkah Mengaktifkannya di Firebase Console →</span>
                  </button>
                )}
              </div>
            )}

            {/* Firebase Activation Guide Box */}
            <div className="rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-left text-xs transition-all">
              <button
                type="button"
                onClick={() => setShowFirebaseGuide(!showFirebaseGuide)}
                className="w-full flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-extrabold cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Panduan Aktivasi Login di Firebase Console</span>
                </div>
                {showFirebaseGuide ? (
                  <ChevronUp className="w-4 h-4 text-indigo-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-indigo-500" />
                )}
              </button>

              {showFirebaseGuide && (
                <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-2.5 text-slate-700 dark:text-slate-300 animate-in fade-in">
                  <p className="text-[11px] leading-relaxed">
                    Untuk mengaktifkan login <strong>Email/Password</strong> atau <strong>Google</strong> di project Firebase:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <li>Buka Firebase Console pada menu <strong>Authentication &gt; Sign-in method</strong>.</li>
                    <li>Klik provider <strong>Email/Password</strong>, centang <strong>Enable</strong>, lalu klik <strong>Save</strong>.</li>
                    <li>(Opsional) Aktifkan juga provider <strong>Google</strong> &amp; <strong>Anonymous</strong> bila dibutuhkan.</li>
                  </ol>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={firebaseConsoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-all shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Firebase Sign-in Providers</span>
                    </a>
                    <button
                      type="button"
                      onClick={copyUrlToClipboard}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedLink ? 'Link Tersalin' : 'Salin URL'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Google Fast Sign-In */}
            {activeTab !== 'forgot' && (
              <>
                <button
                  id="btn-gate-google"
                  type="button"
                  onClick={handleGoogle}
                  disabled={isGoogleLoading}
                  className="w-full py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] shadow-2xs"
                >
                  {isGoogleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>Masuk Cepat dengan Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                  <span className="bg-white dark:bg-[#0f172a] px-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
                    atau dengan email
                  </span>
                </div>
              </>
            )}

            {/* TAB 1: MASUK (LOGIN) FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email / ID Pengguna
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="gate-email"
                      type="text"
                      required
                      placeholder="nama@email.com atau username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="gate-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-gate-submit-login"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: DAFTAR AKUN BARU FORM */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Lengkap / Panggilan
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Yudit"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Email atau Username</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="nama@email.com atau username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password (Minimal 6 karakter)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ulangi Password (Konfirmasi)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Konfirmasi password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Mendaftarkan Akun...' : 'Daftar Akun Baru'}</span>
                </button>
              </form>
            )}

            {/* TAB 3: RESET PASSWORD FORM */}
            {activeTab === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    Masukkan alamat email terdaftar Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Alamat Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim Tautan Reset Password'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold pt-1 cursor-pointer"
                >
                  ← Kembali ke Halaman Masuk
                </button>
              </form>
            )}

            {/* Quick Demo / Guest Access Divider & Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isGuestLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGuestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                <span>Masuk Cepat Mode Tamu / Demo</span>
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <p>© 2026 ArthaSmart. Seluruh data keuangan disimpan secara privat dan terenkripsi.</p>
      </footer>
    </div>
  );
};
