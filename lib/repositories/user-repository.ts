// User repository - ready after schema deployment
// Uncomment after running lib/db/schema.sql in Supabase SQL Editor

/*
import { createClient } from "@/lib/db/server";
import { Database } from "@/lib/db/types";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];
type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"];

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Failed to get user profile", error, { userId });
    throw new DatabaseError("Failed to get user profile");
  }

  return data;
}

export async function createUserProfile(profile: UserProfileInsert): Promise<UserProfile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .insert(profile)
    .select()
    .single();

  if (error) {
    logger.error("Failed to create user profile", error, { userId: profile.id });
    throw new DatabaseError("Failed to create user profile");
  }

  logger.info("User profile created", { userId: data.id });
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserProfile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update user profile", error, { userId });
    throw new DatabaseError("Failed to update user profile");
  }

  logger.info("User profile updated", { userId });
  return data;
}
*/

export {};
