// lib/auth/action.ts
'use server'

import { cookies } from 'next/headers';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { signIn } from "@/auth"
import { OAuthUser } from '@/types/auth';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Include username and avatarUrl in UserSchema
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().optional(),  // Add username
  avatarUrl: z.string().optional(), // Add avatarUrl (optional)
  // ... other user properties ...
});

type User = z.infer<typeof UserSchema>;

const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
} as const;

// Separate config for userInfo cookie (NOT HttpOnly)
const USER_INFO_COOKIE_CONFIG = {
  httpOnly: false, // Client-side JavaScript can read this
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // Match refresh token lifetime (optional)
} as const;

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
}

const setAuthCookies = async (accessToken: string, refreshToken: string) => {
  const cookieStore = await cookies();
  cookieStore.set('accessToken', accessToken, COOKIE_CONFIG);
  cookieStore.set('refreshToken', refreshToken, COOKIE_CONFIG);
};

// New function: Set the userInfo cookie
const setUserInfoCookie = async (user: User) => {
  const cookieStore = await cookies();
  const userInfo = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl, // Only include non-sensitive data
  };
  cookieStore.set('userInfo', JSON.stringify(userInfo), USER_INFO_COOKIE_CONFIG);
};

const clearAuthCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  cookieStore.delete('userInfo'); // Clear userInfo cookie on logout
};

export async function login(formData: FormData): Promise<AuthResponse> {
  try {
    const rawInput = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };
    const validatedInput = LoginSchema.parse(rawInput);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedInput),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const { access_token, refresh_token, user } = await response.json();
    const validatedUser = UserSchema.parse(user); // Validate against updated schema

    setAuthCookies(access_token, refresh_token);
    setUserInfoCookie(validatedUser); // Set the userInfo cookie!
    revalidatePath('/dashboard');

    return { success: true, user: validatedUser };

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken');

    if (accessToken?.value) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      });
    }

    clearAuthCookies();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Failed to logout' };
  }
}

// Updated refreshToken function for lib/auth/action.ts

export async function refreshToken(): Promise<AuthResponse> {
  try {
    const cookieStore = await cookies();
    const refreshTokenValue = cookieStore.get('refreshToken');

    if (!refreshTokenValue?.value) {
      return { success: false, error: 'No refresh token available' };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshTokenValue.value}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      // Clear cookies on refresh failure
      await clearAuthCookies();
      return { success: false, error: 'Token refresh failed' };
    }

    const { access_token, refresh_token, user } = await response.json();
    const validatedUser = UserSchema.parse(user); // Validate

    // Set the new tokens
    await setAuthCookies(access_token, refresh_token);
    await setUserInfoCookie(validatedUser); // Update userInfo cookie on refresh

    return { success: true, user: validatedUser };
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear cookies on any error
    await clearAuthCookies();
    return { success: false, error: 'Failed to refresh token' };
  }
}
// getCurrentUser remains the same, BUT, it doesn't set userInfo
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return null; // No access token, user is not logged in
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },

    });

    if (!response.ok) {
      return null; // API call failed (e.g., token expired)
    }

    const userData = await response.json();
    const validatedUser = UserSchema.parse(userData);
    return validatedUser;

  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function initiateGoogleLogin() {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    ...COOKIE_CONFIG,
    maxAge: 60 * 10, // 10 minutes
  });
  redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/google/login?state=${state}`);
}

export async function handleGoogleCallback(accessToken: string, refreshToken: string): Promise<{ success: boolean, error?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set('accessToken', accessToken, COOKIE_CONFIG);
    cookieStore.set('refreshToken', refreshToken, COOKIE_CONFIG);

    // Fetch user data after successful Google login
    const user = await getCurrentUser();
    console.log('User data:', user);

    if (user) {
      setUserInfoCookie(user); // Set user info cookie
    } else {
      // Handle the case where getCurrentUser fails. This might happen if the
      // access token from Google is somehow invalid.  You might redirect
      // to an error page or the login page.
      return { success: false, error: 'Failed to fetch user data after Google login.' };
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Google callback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete authentication',
    };
  }
}

export async function GoogleLogin() {
  await signIn("google")
}

//lib/auth/action createouath
export const createOAuthAccount = async (account: OAuthUser, id_token: string | undefined) => {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          id_token,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          name: account.name,
          email: account.email,
          profileImageUrl: account.profileImageUrl,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create OAuth account");
    }

    return response;
  } catch (error) {
    console.error("Error creating OAuth account:", error);
    throw error;
  }
}