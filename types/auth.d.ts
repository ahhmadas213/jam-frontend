// app/lib/auth/types.ts

export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  backendTokens?: BackendTokens;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export type OAuthUser = {
  provider: string | undefined | null,
  providerAccountId: string | undefined | null,

  name: string | undefined | null,
  email: string | undefined | null,
  profileImageUrl?: string | undefined | null,
}
