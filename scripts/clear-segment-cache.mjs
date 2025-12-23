import { createClient } from "@supabase/supabase-js";

// Use local Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Clearing cached segment pages without chat widget...");

const { data, error } = await supabase
  .from("site_pages")
  .delete()
  .eq("page_type", "segment")
  .not("html_content", "like", "%NEXTGENWEB_CONFIG%");

if (error) {
  console.error("Error clearing cache:", error);
  process.exit(1);
}

console.log("✓ Successfully cleared cached segment pages");
console.log("Next segment page visits will regenerate with the updated code");
