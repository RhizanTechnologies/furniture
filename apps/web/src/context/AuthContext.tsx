import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserDto, UserRole } from '@furniture/shared';
import { apiClient, ApiError } from '@/lib/api-client';

interface AuthContextType {
  user: (UserDto & { branch?: any }) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isBranchAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(UserDto & { branch?: any }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profile = await apiClient<UserDto & { branch?: any }>('/auth/me');
      setUser(profile);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiClient<{ user: UserDto; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Session is saved in HTTP-only cookie by backend
    await refreshProfile();
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
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
