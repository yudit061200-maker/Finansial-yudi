import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, LoginCredentials, RegisterCredentials, AuthSession } from '../types/user';
import { authService, DEFAULT_WEB_USERS } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allUsers: UserProfile[];
  refreshUsers: () => void;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  quickLogin: (userId: string) => Promise<{ success: boolean; message: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; message: string }>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  resetUsers: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register' | 'demo';
  setAuthModalMode: (mode: 'login' | 'register' | 'demo') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'demo'>('login');

  const refreshUsers = useCallback(() => {
    const users = authService.getUsers();
    setAllUsers(users);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    try {
      const users = authService.getUsers();
      setAllUsers(users);
      const active = authService.getCurrentSession();
      setSession(active);
    } catch (e) {
      console.error('Error initializing web auth:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = authService.login(credentials);
    if (res.success && res.session) {
      setSession(res.session);
      refreshUsers();
      setIsAuthModalOpen(false);
    }
    return { success: res.success, message: res.message };
  };

  const quickLogin = async (userId: string) => {
    const res = authService.quickLogin(userId);
    if (res.success && res.session) {
      setSession(res.session);
      refreshUsers();
      setIsAuthModalOpen(false);
    }
    return { success: res.success, message: res.message };
  };

  const register = async (credentials: RegisterCredentials) => {
    const res = authService.register(credentials);
    if (res.success && res.session) {
      setSession(res.session);
      refreshUsers();
      setIsAuthModalOpen(false);
    }
    return { success: res.success, message: res.message };
  };

  const logout = () => {
    authService.logout();
    setSession(null);
    setIsAuthModalOpen(true);
    setAuthModalMode('login');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user?.id) {
      return { success: false, message: 'Tidak ada sesi login aktif.' };
    }
    const res = authService.updateProfile(session.user.id, updates);
    if (res.success && res.user) {
      setSession((prev) => (prev ? { ...prev, user: res.user! } : null));
      refreshUsers();
    }
    return { success: res.success, message: res.message };
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!session?.user?.id) {
      return { success: false, message: 'Tidak ada sesi login aktif.' };
    }
    const res = authService.changePassword(session.user.id, oldPass, newPass);
    return res;
  };

  const deleteUser = async (userId: string) => {
    const res = authService.deleteUser(userId);
    if (res.success) {
      const active = authService.getCurrentSession();
      setSession(active);
      refreshUsers();
    }
    return res;
  };

  const resetUsers = () => {
    const defaults = authService.resetToDefaultUsers();
    setAllUsers(defaults);
    const active = authService.getCurrentSession();
    setSession(active);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        isAuthenticated: !!session?.user,
        isLoading,
        allUsers,
        refreshUsers,
        login,
        quickLogin,
        register,
        logout,
        updateProfile,
        changePassword,
        deleteUser,
        resetUsers,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        authModalMode,
        setAuthModalMode,
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
