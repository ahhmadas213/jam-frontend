// app/(auth)/layout.tsx
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'
import { ReactNode } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

const layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth()

  if (session) {
    redirect("/dashboard/me")
  }

  return (

      <main className='auth-container '>
        <section className='auth-form bg-[#E6E0FF]'>
          <Link
            href="/"
            className="absolute rounded-full z-10 left-4 top-4 md:left-8 md:top-8 inline-flex items-center justify-center border border-transparent bg-transparent py-2 px-3 text-center text-sm font-medium text-light_gray md:text-black_color hover:text-black_color/60 "
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <div className='auth-box'>

            <div className='flex flex-row gap-2' >
              <div className="w-12 h-12 grid grid-cols-2 gap-1">
                <div className="bg-black rounded-sm" />
                <div className="bg-pink-500 rounded-sm" />
                <div className="bg-pink-500 rounded-sm" />
                <div className="bg-black rounded-sm" />
              </div>
              <h1 className='text-2xl font-semibold text-black_color'>JAM</h1>
            </div>

            <div>
              {children}
            </div>
          </div>
        </section>

        <section className='auth-illustration'>
          <Image
            src="/images/auth-illustration.jpg"
            alt='auth illustration'
            height={1000}
            width={1000}
            className='size-full object-cover'
          />
        </section>
      </main>

  )
}

export default layout