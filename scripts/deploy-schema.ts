import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySchema() {
  console.log("🚀 Deploying database schema to Supabase...\n");

  const schemaPath = join(process.cwd(), "lib/db/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Split into individual statements
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments
    if (statement.startsWith("--")) continue;

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });

      if (error) throw error;

      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] Success`);
    } catch (error: unknown) {
      // Some errors are expected (like "already exists")
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes("already exists") || errorMessage?.includes("does not exist")) {
        console.log(`⚠️  [${i + 1}/${statements.length}] Skipped (${errorMessage.split("\n")[0]})`);
      } else {
        errorCount++;
        console.error(`❌ [${i + 1}/${statements.length}] Error:`, errorMessage);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`\n✨ Schema deployment complete!`);
}

deploySchema().catch(console.error);
