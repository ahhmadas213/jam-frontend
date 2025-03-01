// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createOAuthAccount } from "./lib/auth/action";
import type { OAuthUser } from "./types/auth";

// Define type for backend tokens
interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Extended Session type
interface ExtendedSession {
  isAuthenticated: boolean;
  backendTokens: BackendTokens;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const DEFAULT_TOKEN_EXPIRATION = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

// Helper function to refresh backend tokens
async function refreshBackendTokens(refreshToken: string): Promise<BackendTokens> {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : Date.now() + DEFAULT_TOKEN_EXPIRATION,
    };
  } catch (error) {
    console.error("Error refreshing backend token:", error);
    throw error;
  }
}

// Define the NextAuth configuration using the new Auth.js structure
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${process.env.BACKEND_URL}/api/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          return {
            id: data.user.id,
            name: data.user.name || data.user.username,
            email: data.user.email,
            image: data.user.profile_image_url || null,
            backendTokens: {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: data.expires_in
                ? Date.now() + data.expires_in * 1000
                : Date.now() + DEFAULT_TOKEN_EXPIRATION,
            },
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (account && profile && user.email) {
        try {
          const oAuthUser: OAuthUser = {
            name: user.name || "",
            email: user.email,
            profileImageUrl: user.image || null,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          };

          const response = await createOAuthAccount(
            oAuthUser,
            account.id_token
          );
          
          if (!response.ok) {
            console.error("Backend authentication failed:", await response.text());
            return false;
          }

          const data = await response.json();
          if (data.access_token && data.refresh_token) {
            // Store tokens in the account object
            account.backendTokens = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: data.expires_in
                ? Date.now() + data.expires_in * 1000
                : Date.now() + DEFAULT_TOKEN_EXPIRATION,
            };
            return true;
          }
          console.error("Missing tokens in response:", data);
          return false;
        } catch (error) {
          console.error("Error during OAuth backend processing:", error);
          return false;
        }
      }
      return false;
    },

    async jwt({ token, account, user }) {
      if (account?.provider) {
        if (account.backendTokens) {
          token.backendTokens = account.backendTokens;
          token.tokenUpdateTime = Date.now();
        } else if (user?.backendTokens) {
          token.backendTokens = user.backendTokens;
          token.tokenUpdateTime = Date.now();
        }
      }

      if (token.backendTokens?.refreshToken) {
        const shouldRefresh =
          (token.backendTokens.expiresAt && Date.now() > token.backendTokens.expiresAt) ||
          (token.tokenUpdateTime && Date.now() - token.tokenUpdateTime > DEFAULT_TOKEN_EXPIRATION);

        if (shouldRefresh) {
          try {
            token.backendTokens = await refreshBackendTokens(token.backendTokens.refreshToken);
            token.tokenUpdateTime = Date.now();
          } catch (error) {
            console.error("Token refresh failed:", error);
            delete token.backendTokens;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? "";
        session.isAuthenticated = !!token.backendTokens?.accessToken;
        session.backendTokens = token.backendTokens ?? {
          accessToken: "",
          refreshToken: "",
          expiresAt: 0,
        };
      }
      return session as ExtendedSession;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
});

// Create a helper function to fetch with authentication
export async function fetchWithBackendAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const session = await auth() as ExtendedSession | null;
  const token = session?.backendTokens?.accessToken;

  if (!token) {
    throw new Error("No authentication token available");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${process.env.BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && session?.backendTokens?.refreshToken) {
    try {
      const refreshedTokens = await refreshBackendTokens(session.backendTokens.refreshToken);
      const refreshedHeaders = new Headers(options.headers);
      refreshedHeaders.set("Authorization", `Bearer ${refreshedTokens.accessToken}`);

      return fetch(`${process.env.BACKEND_URL}${path}`, {
        ...options,
        headers: refreshedHeaders,
      });
    } catch (error) {
      console.error("Failed to refresh token in fetchWithBackendAuth:", error);
      throw new Error("Failed to refresh authentication token");
    }
  }

  return response;
}

// Type declarations to augment Next Auth types
declare module "next-auth" {
  interface Session extends ExtendedSession {}
  
  interface User {
    id: string;
    backendTokens?: BackendTokens;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendTokens?: BackendTokens;
    tokenUpdateTime?: number;
  }
}