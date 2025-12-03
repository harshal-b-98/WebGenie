import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Anthropic (optional)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

// Validate environment variables at startup
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error);
    throw new Error("Invalid environment variables. Check your .env file.");
  }
}

// Export validated env
export const env = validateEnv();
