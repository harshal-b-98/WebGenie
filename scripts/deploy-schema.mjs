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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log("🚀 Deploying database schema to Supabase...\n");
console.log(`📍 Project: ${supabaseUrl}\n`);

const schemaPath = join(__dirname, "../lib/db/schema.sql");
const schema = readFileSync(schemaPath, "utf-8");

// Split by semicolons but be smart about it
const statements = [];
let current = "";
let inFunction = false;

for (const line of schema.split("\n")) {
  const trimmed = line.trim();

  // Track if we're inside a function definition
  if (trimmed.includes("CREATE OR REPLACE FUNCTION") || trimmed.includes("CREATE FUNCTION")) {
    inFunction = true;
  }

  if (trimmed.includes("$$ LANGUAGE")) {
    inFunction = false;
  }

  current += line + "\n";

  // Only split on semicolon if not in a function
  if (trimmed.endsWith(";") && !inFunction) {
    const stmt = current.trim();
    if (stmt && !stmt.startsWith("--")) {
      statements.push(stmt);
    }
    current = "";
  }
}

console.log(`📝 Found ${statements.length} SQL statements\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];

  // Show what we're running
  const preview = statement.substring(0, 60).replace(/\n/g, " ");
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: statement }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    successCount++;
    console.log(" ✅");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Some errors are OK (already exists)
    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("duplicate")
    ) {
      skipCount++;
      console.log(" ⚠️  (already exists)");
    } else {
      errorCount++;
      console.log(" ❌");
      console.error(`   Error: ${errorMessage.substring(0, 100)}`);
    }
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ⚠️  Skipped: ${skipCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log(`\n✨ Schema deployment complete!`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Verify tables in Supabase Dashboard`);
  console.log(`   2. Create storage buckets (documents, assets)`);
  console.log(`   3. Run: npm run db:types`);
} else {
  console.log(`\n⚠️  Some errors occurred. Check Supabase dashboard.`);
  process.exit(1);
}
