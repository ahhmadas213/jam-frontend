
import "./globals.css";

import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import type React from "react" // Import React
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";


const inter = Inter({ subsets: ["latin"] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const session = await auth()
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen ",
          inter.className,
        )}
      >
        <SessionProvider session={session}>

          {children}
          <Toaster />
        </SessionProvider>
      </body>

    </html>
  )
}

