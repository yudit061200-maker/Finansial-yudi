import React, { useState } from 'react';
import { Mail, RefreshCw, Send, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EmailVerificationBanner: React.FC = () => {
  const {
    currentUser,
    isEmailVerified,
    isAnonymous,
    sendVerificationEmail,
    reloadUser,
    openAuthModal,
  } = useAuth();

  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Timer cooldown
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If user is not logged in, or is anonymous, or email is verified, or dismissed, don't show
  if (!currentUser || isAnonymous || isEmailVerified || isDismissed) {
    return null;
  }

  const handleSendVerification = async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    setFeedback(null);
    try {
      await sendVerificationEmail();
      setCooldown(60); // 60 seconds cooldown to protect against rate limits
      setFeedback({
        type: 'success',
        message: 'Link verifikasi berhasil dikirim! Silakan periksa kotak masuk (Inbox/Spam) email Anda.',
      });
    } catch (err: any) {
      setCooldown(45); // Cooldown even on error to prevent burst spamming
      setFeedback({
        type: 'error',
        message: err.message || 'Batas pengiriman tercapai (Rate Exceeded). Silakan tunggu sebentar sebelum mencoba lagi.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setFeedback(null);
    try {
      const verified = await reloadUser();
      if (verified) {
        setFeedback({
          type: 'success',
          message: 'Selamat! Email Anda telah berhasil diverifikasi.',
        });
      } else {
        setFeedback({
          type: 'info',
          message: 'Email belum terverifikasi. Pastikan Anda telah mengklik link verifikasi di kotak masuk email Anda.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Gagal memperbarui status. Silakan coba lagi.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      id="email-verification-banner"
      className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white px-3.5 sm:px-6 py-2.5 shadow-md relative z-40 border-b border-amber-400/30"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs sm:text-sm">
        {/* Left: Info icon and explanation */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-100" />
          </div>
          <div className="min-w-0">
            <span className="font-bold tracking-tight">Verifikasi Email Diperlukan:</span>{' '}
            <span className="text-amber-100 font-medium truncate inline-block max-w-[200px] sm:max-w-xs align-bottom">
              {currentUser.email}
            </span>{' '}
            <span className="text-amber-100 hidden md:inline">
              belum diverifikasi. Verifikasi untuk mengamankan data keuangan Anda.
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
          {/* Kirim Ulang Email Link */}
          <button
            id="btn-resend-verification"
            onClick={handleSendVerification}
            disabled={isSending || cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold text-xs transition-all backdrop-blur-xs disabled:opacity-50 cursor-pointer"
            title={cooldown > 0 ? `Tunggu ${cooldown} detik sebelum kirim ulang` : 'Kirim ulang tautan verifikasi ke email Anda'}
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {isSending
                ? 'Mengirim...'
                : cooldown > 0
                ? `Tunggu (${cooldown}s)`
                : 'Kirim Link Verifikasi'}
            </span>
          </button>

          {/* Cek Status Verifikasi */}
          <button
            id="btn-check-verification"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-amber-900 hover:bg-amber-50 active:bg-amber-100 font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Muat ulang status verifikasi email dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Mengecek...' : 'Cek Status'}</span>
          </button>

          {/* Detail / Kelola Akun */}
          <button
            onClick={() => openAuthModal('verify')}
            className="hidden lg:inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white/90 text-xs font-semibold cursor-pointer"
          >
            <span>Bantuan</span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Tutup banner pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Instant Feedback Message Toast */}
      {feedback && (
        <div
          className={`mt-2 p-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/40'
              : feedback.type === 'info'
              ? 'bg-blue-950/90 text-blue-100 border border-blue-500/40'
              : 'bg-rose-950/90 text-rose-100 border border-rose-500/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : feedback.type === 'info' ? (
            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-white/70 hover:text-white text-xs underline cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};
