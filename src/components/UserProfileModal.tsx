import React, { useState } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Phone,
  Lock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  X,
  Plus,
  Trash2,
  ArrowRightLeft,
  KeyRound,
  RotateCcw,
  Sparkles,
  Shield,
  HardDrive,
  Calendar,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types/user';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewAccountModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenNewAccountModal,
}) => {
  const {
    user,
    allUsers,
    isCloudSynced,
    updateProfile,
    changePassword,
    quickLogin,
    deleteUser,
    logout,
    resetUsers,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'accounts' | 'storage'>('profile');

  // Edit Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || 'bg-indigo-600 text-white');

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Sync state when user changes
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setPhone(user.phone || '');
      setAvatarColor(user.avatarColor || 'bg-indigo-600 text-white');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const colorChoices = [
    { label: 'Indigo', class: 'bg-indigo-600 text-white' },
    { label: 'Emerald', class: 'bg-emerald-600 text-white' },
    { label: 'Sky', class: 'bg-sky-600 text-white' },
    { label: 'Violet', class: 'bg-violet-600 text-white' },
    { label: 'Rose', class: 'bg-rose-600 text-white' },
    { label: 'Amber', class: 'bg-amber-600 text-white' },
    { label: 'Teal', class: 'bg-teal-600 text-white' },
  ];

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameParts = name.trim().split(' ');
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : name.trim().slice(0, 2).toUpperCase();

      const res = await updateProfile({
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        avatar: initials,
        avatarColor,
      });

      if (res.success) {
        setSuccessMsg('Profil berhasil diperbarui di penyimpanan browser!');
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Gagal memperbarui profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!oldPassword) {
      setErrorMsg('Masukkan kata sandi lama.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setSuccessMsg(res.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Gagal mengubah kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchAccount = async (targetUserId: string) => {
    if (targetUserId === user.id) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await quickLogin(targetUserId);
      if (res.success) {
        setSuccessMsg(res.message);
        setActiveTab('profile');
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Gagal beralih akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUserAccount = async (targetUserId: string, userName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun "${userName}" dari penyimpanan web?`)) {
      return;
    }
    const res = await deleteUser(targetUserId);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setSuccessMsg(res.message);
    }
  };

  const handleLogoutClick = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0E1322] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-[#0E1322] dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* User Profile Card Top */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${user.avatarColor || 'bg-indigo-600 text-white'} flex items-center justify-center font-black text-xl shadow-md ring-2 ring-white dark:ring-slate-800`}>
              {user.avatar || user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {user.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {user.isDemo ? 'Akun Bawaan' : 'Akun Pengguna'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {user.email} • <span className="font-mono">@{user.username}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Sesi Web Aktif (Local Storage Auth)</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="mt-5 grid grid-cols-4 gap-1 p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Profil Saya
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('accounts');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                activeTab === 'accounts'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Multi-Akun</span>
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {allUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ganti Sandi
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('storage');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                activeTab === 'storage'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Cloud Firebase</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto scrollbar-none">
          
          {/* Notifications */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. EDIT PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Profesi / Kategori Pengguna
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="misal: Software Engineer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Kontak / WhatsApp (Opsional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Avatar Color Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Warna Avatar
                </label>
                <div className="flex items-center gap-2">
                  {colorChoices.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setAvatarColor(c.class)}
                      className={`w-8 h-8 rounded-xl ${c.class} flex items-center justify-center transition-all ${
                        avatarColor === c.class
                          ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {avatarColor === c.class && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className="py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. MULTI-ACCOUNTS / SWITCH ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Daftar Akun Tersimpan di Web Browser
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Beralih akun secara instan tanpa perlu memasukkan kata sandi berulang kali.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsAuthModalOpen(true);
                    setAuthModalMode('register');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Akun</span>
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {allUsers.map((u) => {
                  const isCurrent = u.id === user.id;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${u.avatarColor || 'bg-indigo-600 text-white'} flex items-center justify-center font-black text-sm shadow-sm`}>
                          {u.avatar || u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {u.email} • {u.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleSwitchAccount(u.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Ganti</span>
                          </button>
                        ) : null}

                        {allUsers.length > 1 && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserAccount(u.id, u.name)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus akun dari browser"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetUsers}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Akun Demo Bawaan</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Lama
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan sandi lama (demo: 123456)"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi sandi baru..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
                </button>
              </div>
            </form>
          )}

          {/* 4. FIREBASE CLOUD & WEB STORAGE INFO TAB */}
          {activeTab === 'storage' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Cloud className="w-4 h-4 text-emerald-500" />
                    <span>Penyimpanan Database Cloud (Firebase Firestore)</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200/80 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isCloudSynced ? 'Real-Time Cloud Synced' : 'Tersambung ke Cloud'}
                  </span>
                </div>

                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Google Cloud Firestore</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400">Koleksi Data Pengguna:</span>
                    <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">/users/{user.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400">Akses Tanpa Console:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Aktif (Web Profile Engine)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400">User ID Pengguna:</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{user.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400">Tanggal Terdaftar:</span>
                    <span>{new Date(user.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Aktivitas Terakhir:</span>
                    <span>{new Date(user.lastLoginAt).toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Keamanan & Ketahanan Data Cloud</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Semua data profil pengguna (nama, username, email, kata sandi terenkripsi, dan preferensi) otomatis disimpan di Firebase Firestore database dan dicadangkan di memori browser lokal. Akun yang Anda buat akan tersimpan permanen dan dapat diakses dari mana saja.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Confirmation Modal for Logout */}
        {isLogoutConfirmOpen && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#131A2B] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Konfirmasi Keluar Akun?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sesi login Anda akan diakhiri. Anda dapat masuk kembali kapan saja dengan akun ini.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-colors"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
