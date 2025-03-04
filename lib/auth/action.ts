// lib/auth/action.ts
"use server";

import { signIn, signOut } from "@/auth";
import { OAuthUser } from "@/types/auth";
import { z } from "zod";
import { signInSchema, signUpSchema } from "@/lib/validations";

export async function signInAction(formData: FormData) {
  try {
    const validatedData = signInSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Make the backend call directly here instead of relying solely on authorize
    const response = await fetch(`${process.env.BACKEND_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: validatedData.email,
        password: validatedData.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail?.message || errorData.message || "Invalid email or password";
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    if (!data.access_token || !data.user?.id) {
      return {
        success: false,
        error: "Invalid response from authentication server",
      };
    }

    // If backend call succeeds, proceed with Auth.js signIn
    const result = await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    if (!result || result.error) {
      return {
        success: false,
        error: result?.error || "Failed to authenticate with Auth.js",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in signInAction:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// Other functions remain unchanged
export async function signUpAction(formData: FormData) {
  try {
    const validatedData = signUpSchema.parse({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const response = await fetch(`${process.env.BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: validatedData.username,
        email: validatedData.email,
        password: validatedData.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(errorData);
      return {
        success: false,
        error: errorData.detail?.message || "Signup failed",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred during signup",
    };
  }
}

export async function GoogleLogin() {
  await signIn("google");
}

export const createOAuthAccount = async (account: OAuthUser, id_token: string | undefined) => {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/oauth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    console.log('ths the account,', account)

    if (!response.ok) {
      throw new Error("Failed to create OAuth account");
    }

    return response;
  } catch (error) {
    console.error("Error creating OAuth account:", error);
    throw error;
  }
};

export const signOutAction = async () => {
  await signOut();
};