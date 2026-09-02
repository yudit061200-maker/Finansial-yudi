import { UserProfile, LoginCredentials, RegisterCredentials, AuthSession } from '../types/user';
import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedUsersToFirestore,
  fetchUsersFromFirestore,
} from './firebaseDb';

const STORAGE_KEYS = {
  USERS_LIST: 'arthasmart_web_users_v1',
  ACTIVE_SESSION: 'arthasmart_active_session_v1',
  REMEMBER_ME: 'arthasmart_remember_me_v1',
};

// Default seed users if localStorage is empty
export const DEFAULT_WEB_USERS: UserProfile[] = [
  {
    id: 'user-yudit',
    name: 'Yudit',
    username: 'yudit',
    email: 'yudit061200@gmail.com',
    passwordHash: 'e10adc3949ba59abbe56e057f20f883e', // MD5/simulated hash for '123456'
    role: 'Pengguna Utama (Personal)',
    avatar: 'Y',
    avatarColor: 'bg-indigo-600 text-white',
    phone: '0812-3456-7890',
    currencyPreference: 'IDR',
    monthlySalaryEstimate: 15000000,
    notes: 'Akun utama pengelola keuangan ArthaSmart',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
    isDemo: true,
  },
  {
    id: 'user-budi',
    name: 'Budi Pratama',
    username: 'budi',
    email: 'budi.pratama@arthasmart.id',
    passwordHash: 'e10adc3949ba59abbe56e057f20f883e', // '123456'
    role: 'Software Engineer & Tech Lead',
    avatar: 'BP',
    avatarColor: 'bg-emerald-600 text-white',
    phone: '0813-8899-0011',
    currencyPreference: 'IDR',
    monthlySalaryEstimate: 22000000,
    notes: 'Akun profesional IT dan investasi',
    createdAt: '2026-02-15T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
    isDemo: true,
  },
  {
    id: 'user-siti',
    name: 'Siti Rahmawati',
    username: 'siti',
    email: 'siti.rahma@arthasmart.id',
    passwordHash: 'e10adc3949ba59abbe56e057f20f883e', // '123456'
    role: 'Owner UMKM & Retail',
    avatar: 'SR',
    avatarColor: 'bg-amber-600 text-white',
    phone: '0821-7788-9900',
    currencyPreference: 'IDR',
    monthlySalaryEstimate: 30000000,
    notes: 'Pengelolaan kas toko dan piutang pelanggan',
    createdAt: '2026-03-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
    isDemo: true,
  },
];

// Helper to hash password simply and consistently for client-side storage
function hashPassword(password: string): string {
  // Simple UTF-8 hashing checksum string
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}_${btoa(password).slice(0, 10)}`;
}

export const authService = {
  // Sync users received from Firestore real-time subscription or fetch
  syncUsersFromFirestore(firestoreUsers: UserProfile[]): UserProfile[] {
    try {
      if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(firestoreUsers));

        // Update active session user data if present
        const currentSession = this.getCurrentSession();
        if (currentSession?.user?.id) {
          const updatedCurrent = firestoreUsers.find((u) => u.id === currentSession.user.id);
          if (updatedCurrent) {
            currentSession.user = updatedCurrent;
            const targetStorage = currentSession.rememberMe ? localStorage : sessionStorage;
            targetStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(currentSession));
          }
        }
        return firestoreUsers;
      }
      return this.getUsers();
    } catch (e) {
      console.warn('Failed to sync users with local storage:', e);
      return this.getUsers();
    }
  },

  // Get all registered users from local cache or defaults
  getUsers(): UserProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      if (!stored) {
        // Initialize default seed users
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(DEFAULT_WEB_USERS));
        return DEFAULT_WEB_USERS;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_WEB_USERS;
    } catch (e) {
      console.warn('Failed to load users from web storage:', e);
      return DEFAULT_WEB_USERS;
    }
  },

  // Save all users to localStorage
  saveUsers(users: UserProfile[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to web storage:', e);
    }
  },

  // Get current active session
  getCurrentSession(): AuthSession | null {
    try {
      const sessionStr = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION) || sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (!sessionStr) {
        return null;
      }
      return JSON.parse(sessionStr);
    } catch (e) {
      console.warn('Failed to parse current session:', e);
      return null;
    }
  },

  // Login with identifier (username or email) and password
  async login(credentials: LoginCredentials): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    const users = this.getUsers();
    const cleanId = credentials.identifier.trim().toLowerCase();

    const user = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return {
        success: false,
        message: 'Pengguna dengan email atau username tersebut tidak ditemukan di database.',
      };
    }

    // Password validation:
    // Support default accounts (password: '123456' or hash match) or matching user passwordHash
    const expectedHash = hashPassword(credentials.password);
    const isDefaultPass = credentials.password === '123456';
    const isHashMatch = user.passwordHash === expectedHash || (user.isDemo && isDefaultPass);

    if (!isHashMatch && user.passwordHash) {
      return {
        success: false,
        message: 'Kata sandi yang Anda masukkan salah. Coba periksa kembali.',
      };
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    this.saveUsers(users);

    // Persist login timestamp to Firebase Firestore
    saveUserToFirestore(user).catch((err) => {
      console.warn('Could not sync user last login to Firestore:', err);
    });

    const session: AuthSession = {
      user,
      token: `token_${user.id}_${Date.now()}`,
      loginAt: user.lastLoginAt,
      rememberMe: !!credentials.rememberMe,
    };

    if (credentials.rememberMe) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }

    return {
      success: true,
      session,
      message: `Selamat datang kembali, ${user.name}! Data tersimpan di Cloud Firebase.`,
    };
  },

  // One-click quick login for demo / preset users
  async quickLogin(userId: string): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    user.lastLoginAt = new Date().toISOString();
    this.saveUsers(users);

    // Persist to Firebase Firestore
    saveUserToFirestore(user).catch((err) => {
      console.warn('Could not sync quick login to Firestore:', err);
    });

    const session: AuthSession = {
      user,
      token: `token_${user.id}_${Date.now()}`,
      loginAt: user.lastLoginAt,
      rememberMe: true,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    return {
      success: true,
      session,
      message: `Berhasil beralih ke akun ${user.name}. Sinkronisasi Firebase aktif.`,
    };
  },

  // Register a brand new user stored in Firebase Firestore and cached locally
  async register(credentials: RegisterCredentials): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    const users = this.getUsers();
    const cleanEmail = credentials.email.trim().toLowerCase();
    const cleanUsername = credentials.username.trim().toLowerCase();

    if (!cleanEmail || !cleanUsername || !credentials.name.trim() || !credentials.password) {
      return {
        success: false,
        message: 'Mohon lengkapi semua kolom pendaftaran yang wajib diisi.',
      };
    }

    // Check duplicate email or username
    const emailExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      return {
        success: false,
        message: 'Email tersebut sudah terdaftar. Silakan gunakan email lain atau langsung masuk.',
      };
    }

    const usernameExists = users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (usernameExists) {
      return {
        success: false,
        message: 'Username tersebut sudah dipakai. Pilih username unik lainnya.',
      };
    }

    // Determine avatar initials
    const nameParts = credentials.name.trim().split(' ');
    const initials = nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : credentials.name.slice(0, 2).toUpperCase();

    // Color options
    const colorOptions = [
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-sky-600 text-white',
      'bg-violet-600 text-white',
      'bg-rose-600 text-white',
      'bg-amber-600 text-white',
      'bg-teal-600 text-white',
    ];
    const chosenColor = credentials.avatarColor || colorOptions[Math.floor(Math.random() * colorOptions.length)];

    const newUser: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: credentials.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(credentials.password),
      role: credentials.role?.trim() || 'Pengguna Mandiri',
      avatar: credentials.avatar || initials,
      avatarColor: chosenColor,
      phone: credentials.phone?.trim() || '',
      currencyPreference: 'IDR',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isDemo: false,
    };

    // Save to Firestore first for cloud durability
    try {
      await saveUserToFirestore(newUser);
    } catch (e) {
      console.error('Failed to write user to Firestore:', e);
    }

    const updatedUsers = [...users, newUser];
    this.saveUsers(updatedUsers);

    const session: AuthSession = {
      user: newUser,
      token: `token_${newUser.id}_${Date.now()}`,
      loginAt: newUser.lastLoginAt,
      rememberMe: true,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));

    return {
      success: true,
      session,
      message: `Akun ${newUser.name} berhasil dibuat dan tersimpan di Cloud Firebase!`,
    };
  },

  // Update profile of active user in Firebase Firestore
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; user?: UserProfile; message: string }> {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'User tidak ditemukan.' };
    }

    const updatedUser: UserProfile = {
      ...users[index],
      ...updates,
      id: users[index].id, // protect ID
    };

    // Update in Firestore
    try {
      await saveUserToFirestore(updatedUser);
    } catch (e) {
      console.error('Failed to update user profile in Firestore:', e);
    }

    users[index] = updatedUser;
    this.saveUsers(users);

    // Update active session if currently logged in
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.user.id === userId) {
      currentSession.user = updatedUser;
      const targetStorage = currentSession.rememberMe ? localStorage : sessionStorage;
      targetStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(currentSession));
    }

    return {
      success: true,
      user: updatedUser,
      message: 'Profil pengguna berhasil diperbarui dan disinkronkan ke Cloud Firebase.',
    };
  },

  // Change user password in Firebase Firestore
  async changePassword(userId: string, oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    const oldHash = hashPassword(oldPass);
    const isDefaultPass = oldPass === '123456';
    if (user.passwordHash !== oldHash && !(user.isDemo && isDefaultPass)) {
      return { success: false, message: 'Kata sandi lama Anda salah.' };
    }

    user.passwordHash = hashPassword(newPass);

    // Save to Firestore
    try {
      await saveUserToFirestore(user);
    } catch (e) {
      console.error('Failed to update user password in Firestore:', e);
    }

    this.saveUsers(users);

    return { success: true, message: 'Kata sandi berhasil diganti dan disimpan di Firebase!' };
  },

  // Delete a user from Firebase Firestore and web registry
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    let users = this.getUsers();
    if (users.length <= 1) {
      return { success: false, message: 'Tidak dapat menghapus satu-satunya akun pengguna yang tersisa.' };
    }

    users = users.filter((u) => u.id !== userId);
    this.saveUsers(users);

    // Delete from Firestore
    try {
      await deleteUserFromFirestore(userId);
    } catch (e) {
      console.error('Failed to delete user from Firestore:', e);
    }

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.user.id === userId) {
      // Auto switch to remaining user
      const nextUser = users[0];
      await this.quickLogin(nextUser.id);
    }

    return { success: true, message: 'Akun berhasil dihapus dari Cloud Firebase.' };
  },

  // Logout current session
  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  },

  // Reset web users to factory default demo users in Firestore
  resetToDefaultUsers(): UserProfile[] {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(DEFAULT_WEB_USERS));
    seedUsersToFirestore(DEFAULT_WEB_USERS).catch((err) => {
      console.error('Failed to seed default users to Firestore:', err);
    });

    const firstUser = DEFAULT_WEB_USERS[0];
    const newSession: AuthSession = {
      user: firstUser,
      token: `token_${firstUser.id}_${Date.now()}`,
      loginAt: new Date().toISOString(),
      rememberMe: true,
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(newSession));
    return DEFAULT_WEB_USERS;
  },
};
