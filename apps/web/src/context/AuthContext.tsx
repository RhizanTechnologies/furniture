import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserDto, UserRole } from '@furniture/shared';
import { apiClient, ApiError } from '@/lib/api-client';

export interface AuthContextType {
  user: (UserDto & { branch?: any }) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isBranchAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CURRENT_USER_KEY = 'furniture_current_user';
const CACHED_CREDENTIALS_KEY = 'furniture_cached_credentials';

export const DEFAULT_OFFLINE_PROFILES: Record<string, { profile: UserDto & { branch?: any }; pass: string }> = {
  'owner@furniture.com': {
    pass: 'Owner@123456',
    profile: {
      id: 'f3f8d124-47c3-4451-b123-dbf1899d3e58',
      email: 'owner@furniture.com',
      fullName: 'Abebe Kebede (Owner)',
      role: UserRole.OWNER,
      phone: '+251911000001',
      isActive: true,
      branchId: null,
      branch: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  },
  'admin.central@furniture.com': {
    pass: 'Admin@123456',
    profile: {
      id: 'ef750c56-7326-4b4a-b00e-72328aa8dcc4',
      email: 'admin.central@furniture.com',
      fullName: 'Yonas Alemu (Central Admin)',
      role: UserRole.BRANCH_ADMIN,
      phone: '+251911223344',
      isActive: true,
      branchId: 'e7a7f1ab-867c-4281-9552-d08302a52f42',
      branch: {
        id: 'e7a7f1ab-867c-4281-9552-d08302a52f42',
        name: 'Main Central Workshop & Showroom',
        code: 'BR-MAIN',
        stockMode: 'MAIN_STOCK',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  },
  'admin.bole@furniture.com': {
    pass: 'Admin@123456',
    profile: {
      id: 'd206016d-c0be-418b-b255-099511d931de',
      email: 'admin.bole@furniture.com',
      fullName: 'Selamawit Desta (Bole Admin)',
      role: UserRole.BRANCH_ADMIN,
      phone: '+251922556677',
      isActive: true,
      branchId: '0c3a89e6-e01b-465c-9820-fe020f6d921d',
      branch: {
        id: '0c3a89e6-e01b-465c-9820-fe020f6d921d',
        name: 'Bole Premium Showroom',
        code: 'BR-BOLE',
        stockMode: 'BRANCH_STOCK',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  },
  'nebiyumusbah378@gmail.com': {
    pass: 'Admin@123456',
    profile: {
      id: 'aa812150-2a6f-4070-84a2-ad54c06713bc',
      email: 'nebiyumusbah378@gmail.com',
      fullName: 'Abdulkerim Husen',
      role: UserRole.BRANCH_ADMIN,
      phone: '+251911000000',
      isActive: true,
      branchId: 'c1edd9b4-29ea-455b-94eb-3c84ccac9fce',
      branch: {
        id: 'c1edd9b4-29ea-455b-94eb-3c84ccac9fce',
        name: 'Betel',
        code: 'BET',
        stockMode: 'BRANCH_STOCK',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  },
};

function getCachedCurrentUser(): (UserDto & { branch?: any }) | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user: (UserDto & { branch?: any }) | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function saveUserCredential(email: string, pass: string, profile: UserDto & { branch?: any }) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CACHED_CREDENTIALS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[email.toLowerCase().trim()] = { pass, profile };
    localStorage.setItem(CACHED_CREDENTIALS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function findOfflineUser(email: string, pass: string): (UserDto & { branch?: any }) | null {
  const normEmail = email.toLowerCase().trim();

  // 1. Check custom cached credentials from prior successful online logins
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHED_CREDENTIALS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        if (map[normEmail] && map[normEmail].pass === pass) {
          return map[normEmail].profile;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 2. Check default offline seeded profiles
  const preset = DEFAULT_OFFLINE_PROFILES[normEmail];
  if (preset && preset.pass === pass) {
    return preset.profile;
  }

  return null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(UserDto & { branch?: any }) | null>(() => getCachedCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profile = await apiClient<UserDto & { branch?: any }>('/auth/me');
      if (typeof window !== 'undefined') {
        setUser(profile);
        saveCurrentUser(profile);
      }
    } catch (err) {
      // Only reset session if server returns explicit 401 Unauthorized
      if (err instanceof ApiError && err.statusCode === 401) {
        if (typeof window !== 'undefined') {
          setUser(null);
          saveCurrentUser(null);
        }
      }
      // If network is offline or server unreachable, retain cached user
    } finally {
      if (typeof window !== 'undefined') setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      // If offline, preserve cached user and finish loading immediately
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await apiClient<UserDto & { branch?: any }>('/auth/me');
        if (isMounted) {
          setUser(profile);
          saveCurrentUser(profile);
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          if (isMounted) {
            setUser(null);
            saveCurrentUser(null);
          }
        }
        // Retain cached session on network error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();

    // When connection restores, verify/refresh session
    const handleOnline = () => {
      refreshProfile();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    const normEmail = email.trim().toLowerCase();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        await apiClient<{ user: UserDto; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normEmail, password }),
        });
        const profile = await apiClient<UserDto & { branch?: any }>('/auth/me');
        setUser(profile);
        saveCurrentUser(profile);
        saveUserCredential(normEmail, password, profile);
        return;
      } catch (err: any) {
        // Explicit 401 / 400 from server means credentials are wrong
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 400)) {
          throw err;
        }
        // Otherwise (fetch failed, server unreachable), fallback to offline check
      }
    }

    // Offline login fallback
    const offlineUser = findOfflineUser(normEmail, password);
    if (offlineUser) {
      setUser(offlineUser);
      saveCurrentUser(offlineUser);
      return;
    }

    // Check if user is known but password was wrong
    const preset = DEFAULT_OFFLINE_PROFILES[normEmail];
    if (preset && preset.pass !== password) {
      throw new Error('Invalid email or password. Please try again.');
    }

    throw new Error('Offline login unavailable for this account. Please connect to the internet first.');
  };

  const logout = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await apiClient('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(null);
      saveCurrentUser(null);
    }
  };

  const isOwner = user?.role === UserRole.OWNER;
  const isBranchAdmin = user?.role === UserRole.BRANCH_ADMIN;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isOwner,
        isBranchAdmin,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
