import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables!");
  console.error("Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 Deploying database schema to Supabase...\n");
console.log(`📍 Project: ${supabaseUrl}\n`);

const schemaPath = join(__dirname, "../lib/db/schema.sql");
const schema = readFileSync(schemaPath, "utf-8");

console.log("📄 Executing SQL schema...\n");

try {
  // Execute the entire schema at once
  const { error } = await supabase.rpc("exec_sql", { query: schema });

  if (error) {
    console.error("❌ Failed to deploy schema:");
    console.error(error);
    process.exit(1);
  }

  console.log("✅ Schema deployed successfully!\n");
  console.log("📊 Next steps:");
  console.log("   1. Verify tables in Supabase Dashboard → Database → Tables");
  console.log("   2. Generate types: npm run db:types");
  console.log("   3. Uncomment user-repository.ts and user-service.ts\n");
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
