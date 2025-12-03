// Temporary migration endpoint to create site records for existing workspaces
// DELETE THIS FILE after migration is complete

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";

export async function POST() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    // Get all workspaces for this user
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .is("deleted_at", null);

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({ message: "No workspaces found", created: 0 });
    }

    let created = 0;

    for (const workspace of workspaces) {
      const ws = workspace as { id: string; name: string; description?: string | null };

      // Check if site already exists
      const { data: existing } = await supabase.from("sites").select("id").eq("id", ws.id).single();

      if (!existing) {
        // Create site record
        await supabase.from("sites").insert({
          id: ws.id,
          workspace_id: ws.id,
          user_id: user.id,
          title: ws.name,
          description: ws.description,
          status: "draft",
        } as never);

        created++;
      }
    }

    return NextResponse.json({
      message: `Migration complete. Created ${created} site records.`,
      created,
      total: workspaces.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
