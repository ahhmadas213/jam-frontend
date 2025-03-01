'use client';
// auth/error
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const errorMessages = {
  invalid_issuer: "Invalid authentication provider. Please try again.",
  database_error: "There was a problem with our service. Please try again later.",
  invalid_data: "Invalid account data received. Please try again.",
  authentication_failed: "Authentication failed. Please try again.",
  unknown_error: "An unexpected error occurred. Please try again later.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorCode = searchParams.get('error');

  useEffect(() => {
    const message = errorMessages[errorCode as keyof typeof errorMessages] ||
      "An error occurred during authentication.";

    toast({
      title: "Authentication Error",
      description: message,
      variant: "destructive",
    });
  }, [errorCode]);

  return (
    <div className="flex  items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Authentication Failed</h1>
        <p className="text-muted-foreground">
          {errorMessages[errorCode as keyof typeof errorMessages] ||
            "An error occurred during authentication."}
        </p>
        <div className="space-x-4">
          <Button
            onClick={() => router.push('/sign-in')}
            variant="default"
          >
            Return to signin
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}