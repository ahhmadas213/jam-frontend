'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { handleGoogleCallback } from '@/lib/auth/action'
import { toast } from '@/hooks/use-toast'

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    async function processCallback() {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        toast({
          title: "Authentication Failed",
          description: "Missing authentication tokens",
          variant: "destructive",
        });
        router.push('/sign-in');
        return;
      }

      try {
        const result = await handleGoogleCallback(accessToken, refreshToken);

        if (result.success) {
          toast({
            title: "Login Successful",
            description: "Successfully logged in with Google",
          });

          // After successful auth, trigger a storage event
          // This helps our AuthContext detect the change
          window.dispatchEvent(new Event('storage'));

          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error during Google callback:', error);
        toast({
          title: "Authentication Failed",
          description: "Failed to complete Google authentication",
          variant: "destructive",
        });
        router.push('/sign-in');
      }
    }

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Completing Google Sign In...</h1>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}