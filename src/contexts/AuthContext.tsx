'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AUTH_KEY = 'attendance_manager_logged_in';

type AuthContextType = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoggedIn(localStorage.getItem(AUTH_KEY) === 'true');
    }
  }, []);

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_KEY, 'true');
      setLoggedIn(true);
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_KEY);
      setLoggedIn(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
