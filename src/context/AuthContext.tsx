import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, LoginCredentials, RegisterCredentials, AuthSession } from '../types/user';
import { authService, DEFAULT_WEB_USERS } from '../services/authService';
import { subscribeUsers, seedUsersToFirestore } from '../services/firebaseDb';

interface AuthContextType {
  user: UserProfile | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCloudSynced: boolean;
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
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'demo'>('login');

  const refreshUsers = useCallback(() => {
    const users = authService.getUsers();
    setAllUsers(users);
  }, []);

  // Initialize session on mount and subscribe to Firestore users
  useEffect(() => {
    try {
      const initialUsers = authService.getUsers();
      setAllUsers(initialUsers);
      const active = authService.getCurrentSession();
      setSession(active);
    } catch (e) {
      console.error('Error initializing web auth:', e);
    } finally {
      setIsLoading(false);
    }

    // Subscribe to Firebase Firestore real-time updates for users collection
    const unsubscribe = subscribeUsers((firestoreUsers) => {
      if (firestoreUsers.length === 0) {
        // First-time Firestore setup for users collection: auto-seed defaults
        seedUsersToFirestore(DEFAULT_WEB_USERS).catch((err) => {
          console.warn('Initial seed to Firestore users collection notice:', err);
        });
      } else {
        const synced = authService.syncUsersFromFirestore(firestoreUsers);
        setAllUsers(synced);
        setIsCloudSynced(true);

        // Sync active session if the current user profile was updated remotely
        const active = authService.getCurrentSession();
        if (active?.user?.id) {
          const freshCurrent = firestoreUsers.find((u) => u.id === active.user.id);
          if (freshCurrent) {
            setSession((prev) => (prev ? { ...prev, user: freshCurrent } : null));
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await authService.login(credentials);
    if (res.success && res.session) {
      setSession(res.session);
      refreshUsers();
      setIsAuthModalOpen(false);
    }
    return { success: res.success, message: res.message };
  };

  const quickLogin = async (userId: string) => {
    const res = await authService.quickLogin(userId);
    if (res.success && res.session) {
      setSession(res.session);
      refreshUsers();
      setIsAuthModalOpen(false);
    }
    return { success: res.success, message: res.message };
  };

  const register = async (credentials: RegisterCredentials) => {
    const res = await authService.register(credentials);
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
    const res = await authService.updateProfile(session.user.id, updates);
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
    const res = await authService.changePassword(session.user.id, oldPass, newPass);
    return res;
  };

  const deleteUser = async (userId: string) => {
    const res = await authService.deleteUser(userId);
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
        isCloudSynced,
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
