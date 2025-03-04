// app/sign-up/page.tsx
'use client'
import AuthForm from '@/components/AuthForm'
import { signUpAction } from '@/lib/auth/action'
import { signUpSchema } from '@/lib/validations'

const SignUpPage = () => {
  return (
    <AuthForm 
      type='SIGN_UP'
      schema={signUpSchema}
      defaultValues={{
        username: '',
        email: '',
        password: '',
      }}
      onSubmit={signUpAction}
    />
  )
}

export default SignUpPage