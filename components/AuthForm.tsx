// components/AuthForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, FieldValues, Path, SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FIELD_NAMES, FIELD_TYPES } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import GoogleSignInButton from "./GoogleSignInButton";
import { GoogleLogin } from "@/lib/auth/action";
import { useState } from "react";

interface Props<T extends FieldValues> {
  schema: z.ZodType<T>;
  defaultValues: T;
  onSubmit: (formData: FormData) => Promise<{
    success: boolean;
    error?: string;
  }>;
  type: "SIGN_IN" | "SIGN_UP";
}

const AuthForm = <T extends FieldValues>({ type, schema, defaultValues, onSubmit }: Props<T>) => {
  const router = useRouter();
  const isSignIn = type === "SIGN_IN";
  const [loading, setIsLoading] = useState(false);
  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    setIsLoading(true);
    const formData = new FormData();
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        formData.append(key, String(data[key as keyof T]));
      }
    }
    try {
      const result = await onSubmit(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: isSignIn
            ? "You have successfully signed in"
            : "You have successfully signed up",
          variant: "default",
        });
        router.push("/");
      } else {
        toast({
          title: `Error ${isSignIn ? "signing in" : "signing up"}`,
          description: result.error ?? "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("onSubmit error", error);
      toast({
        title: `Error ${isSignIn ? "signing in" : "signing up"}`,
        description: (error as { message?: string })?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{isSignIn ? "Welcome back to JAM" : "Create your account now"}</h1>
      <p className="text-gray-500">
        {isSignIn ? "Just a minute - your learning journey awaits" : "Please complete all fields to access JAM"}
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">{FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}</FormLabel>
                  <FormControl>
                    <Input
                      className="form-input"
                      required
                      type={FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button disabled={loading} className={`form-btn ${loading ? "bg-gray-500 cursor-not-allowed" : ""}`} type="submit">
            {isSignIn ? "Sign in" : "Sign up"}
          </Button>
          <div className="mt-6">
            <GoogleSignInButton onSignIn={GoogleLogin} />
          </div>
        </form>
      </Form>
      <p className="text-center text-gray-500 text-base font-medium">
        {isSignIn ? "Don't have an account yet? " : "Already have an account? "}
        <Link href={isSignIn ? "/sign-up" : "/sign-in"} className="font-bold text-primary">
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};

export default AuthForm;