'use client'

import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/lib/auth/AuthContext';
import { signInSchema } from '@/lib/validations'
import React from 'react'
// singin page 

const SignInPage = () => {
  const {login} = useAuth()
  return (
    <AuthForm type='SIGN_IN'
      schema={signInSchema}
      defaultValues={{ email: '', password: '' }}
      onSubmit={login}
    />
  )
}

export default SignInPage