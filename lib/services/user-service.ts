// User service - ready after schema deployment
// Uncomment after running lib/db/schema.sql in Supabase SQL Editor

/*
import * as userRepository from "@/lib/repositories/user-repository";
import { logger } from "@/lib/utils/logger";

export async function getOrCreateUserProfile(userId: string) {
  let profile = await userRepository.getUserProfile(userId);

  if (!profile) {
    logger.info("Creating new user profile", { userId });
    profile = await userRepository.createUserProfile({
      id: userId,
      full_name: null,
      avatar_url: null,
      tier: "free",
      credits_remaining: 10,
    });
  }

  return profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
) {
  return userRepository.updateUserProfile(userId, updates);
}

export async function decrementCredits(userId: string, amount: number = 1) {
  const profile = await userRepository.getUserProfile(userId);

  if (!profile) {
    throw new Error("User profile not found");
  }

  const newCredits = Math.max(0, profile.credits_remaining - amount);

  return userRepository.updateUserProfile(userId, {
    credits_remaining: newCredits,
  });
}

export async function canUseFeature(userId: string, feature: "generation" | "refinement") {
  const profile = await userRepository.getUserProfile(userId);

  if (!profile) {
    return false;
  }

  // Free tier limits
  if (profile.tier === "free") {
    if (feature === "generation" && profile.credits_remaining <= 0) {
      return false;
    }
  }

  return true;
}
*/

export {};
