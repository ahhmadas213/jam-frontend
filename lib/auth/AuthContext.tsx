'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { login, logout } from '@/lib/auth/action';
import { z } from 'zod';

// Full user data schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(), // Make email optional in client-side
  username: z.string().optional(),
  avatarUrl: z.string().optional()
});

export type User = z.infer<typeof UserSchema>;

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  login: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  initialUser: User | null;
  initialIsAuthenticated: boolean;
}

// Helper function to get user from cookie on client-side
const getUserFromCookie = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userInfoCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('userInfo='));
      
    if (userInfoCookie) {
      const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split('=')[1]));
      return userInfo;
    }
  } catch (error) {
    console.error('Error parsing userInfo cookie:', error);
  }
  
  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  initialUser, 
  initialIsAuthenticated 
}) => {
  // Initialize with props values OR cookie values (for client-side navigation)
  const [user, setUser] = useState<User | null>(initialUser || getUserFromCookie());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    initialIsAuthenticated || !!getUserFromCookie()
  );
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Listen for cookie changes
  useEffect(() => {
    const handleStorageChange = () => {
      const cookieUser = getUserFromCookie();
      setUser(cookieUser);
      setIsAuthenticated(!!cookieUser);
    };

    // Run on mount to make sure we're in sync
    handleStorageChange();

    // Listen for changes to cookies (via a storage event proxy)
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await login(formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        router.push('/dashboard');
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
      setIsAuthenticated(false);
      router.push('/login');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};