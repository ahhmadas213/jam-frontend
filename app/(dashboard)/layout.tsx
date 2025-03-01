// app/(dashboard)/layout.tsx 
import { cookies } from 'next/headers';
import { AuthProvider } from '@/lib/auth/AuthContext';
import React from 'react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user info from the cookie instead of making an API call
  let initialUser = null;
  let initialIsAuthenticated = false;

  try {
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('userInfo');
    
    if (userInfoCookie?.value) {
      initialUser = JSON.parse(userInfoCookie.value);
      initialIsAuthenticated = true;
    }
  } catch (error) {
    console.error('Error parsing user info cookie:', error);
  }

  return (
    <AuthProvider initialUser={initialUser} initialIsAuthenticated={initialIsAuthenticated}>
      {children}
    </AuthProvider>
  );
}