import { createClient } from "@/lib/db/server";
import { AuthenticationError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to get user", error);
    throw new AuthenticationError("Failed to authenticate user");
  }

  return user;
}

export async function requireUser() {
  const user = await getUser();

  if (!user) {
    throw new AuthenticationError("Authentication required");
  }

  return user;
}

export async function getSession() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    logger.error("Failed to get session", error);
    throw new AuthenticationError("Failed to get session");
  }

  return session;
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new AuthenticationError("Session required");
  }

  return session;
}
