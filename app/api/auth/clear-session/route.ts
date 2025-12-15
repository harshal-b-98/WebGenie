import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Clear all Supabase auth cookies and redirect to login
 * Use this when auth tokens become invalid
 */
export async function GET() {
  const cookieStore = await cookies();

  // Get all cookies and delete ones related to Supabase auth
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    if (
      cookie.name.includes("sb-") ||
      cookie.name.includes("supabase") ||
      cookie.name.includes("auth")
    ) {
      cookieStore.delete(cookie.name);
    }
  }

  // Redirect to login
  return NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1729")
  );
}
