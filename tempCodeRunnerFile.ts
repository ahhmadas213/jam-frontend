import NextAuth, { Account, User, Session } from "next-auth";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { createOAuthAccount } from "./lib/auth/action";
import { OAuthUser } from "./types/auth";

// Define type for backend tokens
interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

// Extend the User type to include backendTokens
interface ExtendedUser extends User {
  backendTokens?: BackendTokens;
  id?: string;
}

// Extend the Account type to include backendTokens
interface ExtendedAccount extends Account {
  backendTokens?: BackendTokens;
}

// Extend the Session type to include backendTokens
interface ExtendedSession extends Session {
  backendTokens: BackendTokens;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Extend the JWT type to include backendTokens and sub
interface ExtendedJWT extends JWT {
  backendTokens?: BackendTokens;
}

// Helper function to refresh backend tokens
async function refreshBackendTokens(refreshToken: string): Promise<BackendTokens> {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error refreshing backend token:", error);
    throw error;
  }
}

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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Send credentials to backend for validation
          const response = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null; // Authentication failed
          }

          const data = await response.json();

          // Return user object with backend tokens
          return {
            id: data.user.id,
            name: data.user.name || data.user.username,
            email: data.user.email,
            image: data.user.image,
            backendTokens: {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: data.expires_at,
            },
          } as ExtendedUser;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For credential login, the tokens are already in the user object
      if (account?.provider === "credentials") {
        return true;
      }

      // For OAuth providers, send data to backend
      if (account && profile && user.email) {
        try {
          const oAuthUser: OAuthUser = {
            name: user.name || '',
            email: user.email,
            profileImageUrl: user.image || null,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          };

          const response = await createOAuthAccount(oAuthUser);

          if (!response.ok) {
            console.error("Backend authentication failed");
            return false;
          }

          // Extract backend tokens
          const data = await response.json();

          // Add backend tokens to the account
          (account as ExtendedAccount).backendTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
          };

          return true;
        } catch (error) {
          console.error("Error during OAuth backend processing:", error);
          return false;
        }
      }

      return false;
    },

    async jwt({ token, account, user }) {
      const extendedToken = token as ExtendedJWT;

      // Initial sign-in: add backend tokens to the JWT
      if (account && (account as ExtendedAccount).backendTokens) {
        extendedToken.backendTokens = (account as ExtendedAccount).backendTokens;
      } else if (user && (user as ExtendedUser).backendTokens) {
        extendedToken.backendTokens = (user as ExtendedUser).backendTokens;
      }

      // Check if token needs refreshing
      if (extendedToken.backendTokens?.expiresAt &&
        Date.now() > extendedToken.backendTokens.expiresAt * 1000) {
        try {
          const refreshedTokens = await refreshBackendTokens(extendedToken.backendTokens.refreshToken);
          extendedToken.backendTokens = refreshedTokens;
        } catch (error) {
          // If refresh fails, clear the tokens
          console.error("Token refresh failed", error);
          delete extendedToken.backendTokens;
        }
      }

      return extendedToken;
    },

    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;
      const extendedSession = session as ExtendedSession;

      // Add backend tokens to the session
      if (extendedToken.backendTokens) {
        extendedSession.backendTokens = extendedToken.backendTokens;
      }

      if (extendedToken.sub) {
        if (!extendedSession.user) extendedSession.user = {} as any;
        extendedSession.user.id = extendedToken.sub;
      }


      return extendedSession;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

// Export a helper for making authenticated requests
export async function fetchWithBackendAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await auth() as ExtendedSession | null;

  if (!session?.backendTokens?.accessToken) {
    throw new Error("No authentication token available");
  }

  // Check if token might be expired and needs refreshing
  if (session.backendTokens.expiresAt && Date.now() > session.backendTokens.expiresAt * 1000) {
    try {
      // This will trigger a token refresh
      await auth();
      // Get the updated session with the refreshed token
      const updatedSession = await auth() as ExtendedSession | null;

      if (!updatedSession?.backendTokens?.accessToken) {
        throw new Error("Failed to refresh authentication token");
      }

      // Use the refreshed token
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${updatedSession.backendTokens.accessToken}`);

      return fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      console.error("Error refreshing token for request:", error);
      throw new Error("Authentication failed");
    }
  }

  // Use existing token
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.backendTokens.accessToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
