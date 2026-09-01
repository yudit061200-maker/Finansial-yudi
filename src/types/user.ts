export type UserRole = 'admin' | 'user' | 'family' | 'manager';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash?: string; // Stored securely in web storage
  role: string; // e.g. "Software Engineer", "Business Owner", "Freelancer", "Karyawan"
  avatar: string; // Initial or avatar icon identifier
  avatarColor: string; // Hex or tailwind color class
  phone?: string;
  currencyPreference?: string;
  monthlySalaryEstimate?: number;
  notes?: string;
  createdAt: string;
  lastLoginAt: string;
  isDemo?: boolean;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  loginAt: string;
  rememberMe: boolean;
}

export interface LoginCredentials {
  identifier: string; // Email or username
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: string;
  avatar?: string;
  avatarColor?: string;
  phone?: string;
}
