import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, LoginPayload, RegisterPayload } from '../api/authApi';
import { UserResponse } from '../api/types';
import { queryClient } from '../app/queryClient';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserResponse>;
  register: (payload: RegisterPayload) => Promise<UserResponse>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
let currentUserRequest: Promise<UserResponse> | null = null;

const loadCurrentUser = () => {
  currentUserRequest ??= authApi.me().finally(() => {
    currentUserRequest = null;
  });
  return currentUserRequest;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async (suppressError = false) => {
    try {
      const currentUser = await loadCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
      if (!suppressError) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCurrentUser(true);
  }, []);

  const login = async (payload: LoginPayload) => {
    const loggedInUser = await authApi.login(payload);
    setUser(loggedInUser);
    queryClient.clear(); // Ensure clean cache for new session
    return loggedInUser;
  };

  const register = async (payload: RegisterPayload) => {
    // Note: register doesn't auto-login as per API contract
    return authApi.register(payload);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      queryClient.clear(); // Clear all user cached data
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refetchUser: () => fetchCurrentUser(false),
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
