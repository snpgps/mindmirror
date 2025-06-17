"use client";
import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string, role: UserRole, doctorCode?: string) => void;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('mindmirror-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('mindmirror-user');
    }
    setLoading(false);
  }, []);

  const login = useCallback((email: string, name: string, role: UserRole, doctorCode?: string) => {
    const newUser: User = { id: Date.now().toString(), email, name, role };
    if (role === 'doctor' && doctorCode) {
      (newUser as any).doctorCode = doctorCode;
    }
    setUser(newUser);
    localStorage.setItem('mindmirror-user', JSON.stringify(newUser));
    if (role === 'patient') {
      router.push('/patient/dashboard');
    } else {
      router.push('/doctor/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mindmirror-user');
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user && !loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
