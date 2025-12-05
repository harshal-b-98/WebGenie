import { streamText } from "ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient } from "@/lib/db/server";
import { GENERATION_SYSTEM_PROMPT } from "@/lib/ai/prompts/generation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { message, siteId, currentVersionId } = await request.json();

    if (!message || !siteId || !currentVersionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current version HTML for context
    const { data: version } = await supabase
      .from("site_versions")
      .select("html_content, site_id")
      .eq("id", currentVersionId)
      .single();

    if (!version) {
      return NextResponse.json({ error: "Current version not found" }, { status: 404 });
    }

    const versionData = version as { html_content: string; site_id: string };

    // Verify site ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("id", versionData.site_id)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentHTML = versionData.html_content;

    // Create refinement prompt (focus on incremental changes)
    const refinementPrompt = `You are refining an existing website. Here is the current HTML:

---CURRENT WEBSITE---
${currentHTML.substring(0, 8000)}
---END CURRENT WEBSITE---

USER REQUESTED CHANGES:
${message}

CRITICAL INSTRUCTIONS:
1. Apply the requested changes to the website
2. Maintain the existing design style and structure unless changes require modifications
3. Keep all existing content unless explicitly asked to change it
4. Return ONLY the raw HTML code (full document from <!DOCTYPE> to </html>)
5. DO NOT wrap the HTML in markdown code blocks or backticks
6. DO NOT include any explanatory text before or after the HTML
7. Make TARGETED, INCREMENTAL changes - don't rebuild everything
8. The response must START with <!DOCTYPE html> and END with </html>

Generate the updated HTML now (raw HTML only, no markdown):`;

    // Stream AI response with SSE
    const result = streamText({
      model: defaultGenerationModel,
      system: GENERATION_SYSTEM_PROMPT,
      prompt: refinementPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      abortSignal: AbortSignal.timeout(45000), // 45s timeout
      onFinish: async ({ text: htmlContent }) => {
        // Clean up any markdown formatting (in case AI adds it despite instructions)
        let cleanedHTML = htmlContent.trim();

        // Remove markdown code blocks if present
        if (cleanedHTML.startsWith("```html")) {
          cleanedHTML = cleanedHTML.replace(/^```html\n?/, "").replace(/\n?```$/, "");
        } else if (cleanedHTML.startsWith("```")) {
          cleanedHTML = cleanedHTML.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        cleanedHTML = cleanedHTML.trim();

        // Save as new version (same pattern as generation-service.ts)
        const { count } = await supabase
          .from("site_versions")
          .select("*", { count: "exact", head: true })
          .eq("site_id", siteId);

        const nextVersionNumber = (count || 0) + 1;

        const { data: newVersion } = await supabase
          .from("site_versions")
          .insert({
            site_id: siteId,
            version_number: nextVersionNumber,
            html_content: cleanedHTML,
            generation_type: "refinement", // Key: marks as refinement!
            ai_provider: "openai",
            model: "gpt-4o",
            created_by: user.id,
            prompt_context: {
              refinementRequest: message,
              previousVersionId: currentVersionId,
            },
            change_summary: message.substring(0, 500),
          } as never)
          .select()
          .single();

        // Version saved successfully
        if (newVersion) {
          console.log("New version created:", (newVersion as { id: string }).id);
        }
      },
    });

    // Return streaming response (AI SDK handles SSE automatically!)
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Refinement error:", error);
    return NextResponse.json({ error: "Failed to refine website" }, { status: 500 });
  }
}
