// app/(dashboard)/layout.tsx 
import React from 'react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user info from the cookie instead of making an API call

  return (
    <main>

      {children}
    </main>
  );
}