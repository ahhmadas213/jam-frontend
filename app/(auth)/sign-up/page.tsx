'use client'
import AuthForm from '@/components/AuthForm'
import { register } from '@/lib/actions/auth'
import { signUpSchema } from '@/lib/validations'
import React from 'react'

const SignUpPage = () => {
  

  return (
    <AuthForm type='SIGN_UP'
      schema={signUpSchema}
      defaultValues={{
        username: '',
        email: '',
        password: '',

      }}
      onSubmit={register}
    />
  )
}

export default SignUpPage