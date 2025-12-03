"use client";

import { createClient } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

export async function signUp(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    logger.error("Signup failed", error);
    throw error;
  }

  logger.info("User signed up successfully", { userId: data.user?.id });
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.error("Sign in failed", error);
    throw error;
  }

  logger.info("User signed in successfully", { userId: data.user?.id });
  return data;
}

export async function signInWithGoogle() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    logger.error("Google sign in failed", error);
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error("Sign out failed", error);
    throw error;
  }

  logger.info("User signed out successfully");
}

export async function resetPassword(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password?type=recovery`,
  });

  if (error) {
    logger.error("Password reset failed", error);
    throw error;
  }

  logger.info("Password reset email sent", { email });
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    logger.error("Password update failed", error);
    throw error;
  }

  logger.info("Password updated successfully");
}
