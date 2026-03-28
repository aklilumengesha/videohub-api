'use client';

// Auth Context — global state for authentication
// Any component can call useAuth() to get the current user and login/logout functions
// This is the standard pattern for auth in Next.js apps

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, tokenStorage } from '@/lib/api';

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Provider wraps the entire app — add it to layout.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // true while checking localStorage

  // On mount, check if a token already exists in localStorage
  // This keeps the user logged in after page refresh
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    setIsLoggedIn(!!token);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    // authApi.login saves tokens to localStorage automatically
    setIsLoggedIn(true);
  };

  const register = async (name: string, email: string, password: string) => {
    await authApi.register(name, email, password);
    setIsLoggedIn(true);
  };

  const logout = () => {
    authApi.logout(); // clears localStorage
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — components call this instead of useContext(AuthContext) directly
// Throws if used outside of AuthProvider (catches mistakes early)
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
