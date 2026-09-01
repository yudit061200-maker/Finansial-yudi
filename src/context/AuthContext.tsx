import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export type AuthTab = 'login' | 'register' | 'forgot' | 'profile';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAnonymous: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: AuthTab) => void;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, displayName?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  loginAnonymously: () => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (newPass: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for human-readable Indonesian error messages from Firebase error codes
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Terjadi kesalahan tidak terduga.';
  const code = error.code || (typeof error === 'string' ? error : '');
  const message = error.message || '';

  if (code.includes('too-many-requests') || message.includes('quota') || message.includes('rate-limit') || message.includes('exceeded')) {
    return 'Batas permintaan terlampaui (Rate Limit Exceeded). Firebase membatasi frekuensi pengiriman link email demi keamanan. Mohon tunggu 1-2 menit sebelum mencoba kembali.';
  }

  switch (code) {
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid. Periksa kembali email Anda.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan oleh administrator.';
    case 'auth/user-not-found':
      return 'Akun dengan email ini tidak ditemukan. Silakan daftar akun baru.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau password yang Anda masukkan salah. Silakan coba lagi.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk atau gunakan fitur lupa password.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter kombinasi huruf dan angka.';
    case 'auth/too-many-requests':
      return 'Batas permintaan terlampaui (Rate Limit Exceeded). Harap tunggu 1-2 menit sebelum mencoba kirim ulang lagi.';
    case 'auth/requires-recent-login':
      return 'Sesi keamanan Anda telah berakhir. Harap login ulang untuk melanjutkan tindakan ini.';
    case 'auth/network-request-failed':
      return 'Gagal terhubung ke jaringan. Periksa koneksi internet Anda.';
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum proses selesai.';
    case 'auth/popup-blocked':
      return 'Jendela popup diblokir oleh peramban (browser). Izinkan popup untuk login.';
    case 'auth/operation-not-allowed':
      return 'Metode login (Email/Password atau Google) belum diaktifkan di Firebase Console. Silakan aktifkan Sign-in provider di Firebase Console > Authentication.';
    case 'auth/unverified-email':
      return 'Email Anda belum diverifikasi. Silakan periksa inbox / spam email Anda.';
    default:
      return message || 'Terjadi kendala saat memproses otentikasi. Silakan coba lagi.';
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAuthModal = (tab: AuthTab = 'login') => {
    setAuthModalTab(tab);
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthError(null);
  };

  // Register New Account with Email/Username & Password
  const registerWithEmail = async (email: string, pass: string, displayName?: string): Promise<User> => {
    setAuthError(null);
    try {
      const emailToUse = email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@arthasmart.local`;
      const cred = await createUserWithEmailAndPassword(auth, emailToUse, pass);
      
      // Update display name if provided
      if (displayName && displayName.trim()) {
        await updateProfile(cred.user, {
          displayName: displayName.trim(),
        });
      }

      setCurrentUser(cred.user);
      return cred.user;
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Sign In with Email/Username and Password
  const loginWithEmail = async (email: string, pass: string): Promise<User> => {
    setAuthError(null);
    try {
      const emailToUse = email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@arthasmart.local`;
      const cred = await signInWithEmailAndPassword(auth, emailToUse, pass);
      setCurrentUser(cred.user);
      return cred.user;
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Login with Google
  const loginWithGoogle = async (): Promise<User> => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setCurrentUser(cred.user);
      return cred.user;
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Login Anonymously (Guest / Demo Mode)
  const loginAnonymously = async (): Promise<User> => {
    setAuthError(null);
    try {
      const cred = await signInAnonymously(auth);
      setCurrentUser(cred.user);
      return cred.user;
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Send Password Reset Email
  const resetPassword = async (email: string): Promise<void> => {
    setAuthError(null);
    try {
      const emailToUse = email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@arthasmart.local`;
      await sendPasswordResetEmail(auth, emailToUse);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Update Password for current user
  const updateUserPassword = async (newPass: string): Promise<void> => {
    setAuthError(null);
    if (!auth.currentUser) {
      throw new Error('Anda belum masuk ke akun.');
    }
    try {
      await updatePassword(auth.currentUser, newPass);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Update User Profile Display Name / Photo
  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    setAuthError(null);
    if (!auth.currentUser) {
      throw new Error('Anda belum masuk ke akun.');
    }
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL || auth.currentUser.photoURL,
      });
      // Update local state
      setCurrentUser({ ...auth.currentUser, displayName: displayName.trim() } as User);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Sign out
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const isAnonymous = Boolean(currentUser?.isAnonymous);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAnonymous,
        isAuthModalOpen,
        authModalTab,
        setIsAuthModalOpen,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAnonymously,
        resetPassword,
        updateUserPassword,
        updateUserProfile,
        logout,
        authError,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
