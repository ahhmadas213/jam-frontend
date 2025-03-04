// app/sign-in/page.tsx
'use client'
import AuthForm from '@/components/AuthForm'
import { signInAction } from '@/lib/auth/action'
import { signInSchema } from '@/lib/validations'

const SignInPage = () => {
  return (
    <AuthForm 
      type='SIGN_IN'
      schema={signInSchema}
      defaultValues={{ 
        email: '', 
        password: '' 
      }}
      onSubmit={signInAction}
    />
  )
}

export default SignInPage