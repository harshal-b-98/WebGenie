import { generateText } from "ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient } from "@/lib/db/server";
import { GENERATION_SYSTEM_PROMPT } from "@/lib/ai/prompts/generation";
import { refineRequestSchema, validateBody } from "@/lib/validation";
import {
  injectDynamicNav,
  injectChatWidget,
  ChatWidgetConfig,
} from "@/lib/services/generation-service";
import { AuthenticationError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Validate request body
    const validation = await validateBody(request, refineRequestSchema);
    if (validation.error) return validation.error;
    const { message, siteId, currentVersionId } = validation.data;

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

    // Verify site ownership and get site details
    const { data: site } = await supabase
      .from("sites")
      .select(
        "id, user_id, title, chat_widget_enabled, chat_widget_config, dynamic_pages_enabled, persona_detection_enabled"
      )
      .eq("id", versionData.site_id)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const siteData = site as {
      id: string;
      user_id: string;
      title: string;
      chat_widget_enabled?: boolean;
      chat_widget_config?: ChatWidgetConfig;
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
    };

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

    // Generate HTML silently (not streamed to client)
    const result = await generateText({
      model: defaultGenerationModel,
      system: GENERATION_SYSTEM_PROMPT,
      prompt: refinementPrompt,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(60000), // 60s timeout
    });

    const htmlContent = result.text;

    // Clean up any markdown formatting (in case AI adds it despite instructions)
    let cleanedHTML = htmlContent.trim();

    // Remove markdown code blocks if present
    if (cleanedHTML.startsWith("```html")) {
      cleanedHTML = cleanedHTML.replace(/^```html\n?/, "").replace(/\n?```$/, "");
    } else if (cleanedHTML.startsWith("```")) {
      cleanedHTML = cleanedHTML.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    cleanedHTML = cleanedHTML.trim();

    // Save as new version first (to get the version ID for dynamic nav injection)
    const { count } = await supabase
      .from("site_versions")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId);

    const nextVersionNumber = (count || 0) + 1;

    const { data: newVersion, error: insertError } = await supabase
      .from("site_versions")
      .insert({
        site_id: siteId,
        version_number: nextVersionNumber,
        html_content: cleanedHTML, // Save without dynamic nav first
        generation_type: "refinement",
        ai_provider: "openai",
        model: "gpt-4o",
        created_by: user.id,
        prompt_context: {
          refinementRequest: message,
          previousVersionId: currentVersionId,
        },
        change_summary: message.substring(0, 500),
      } as never)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save version:", insertError);
      return NextResponse.json({ error: "Failed to save changes" }, { status: 500 });
    }

    const newVersionId = (newVersion as { id: string }).id;

    // Extract settings from site data
    const dynamicPagesEnabled = siteData.dynamic_pages_enabled ?? true;
    const personaDetectionEnabled = siteData.persona_detection_enabled ?? false;
    const chatWidgetEnabled = siteData.chat_widget_enabled ?? true;
    const chatWidgetConfig = siteData.chat_widget_config || {};

    // Inject widgets based on settings
    let enhancedHTML = cleanedHTML;

    // Inject dynamic navigation if enabled
    if (dynamicPagesEnabled) {
      enhancedHTML = injectDynamicNav(
        enhancedHTML,
        siteId,
        newVersionId,
        siteData.title || "Company",
        personaDetectionEnabled
      );
    }

    // Inject chat widget if enabled
    enhancedHTML = injectChatWidget(
      enhancedHTML,
      siteId,
      newVersionId,
      chatWidgetEnabled,
      chatWidgetConfig
    );

    // Update the version with enhanced HTML
    await supabase
      .from("site_versions")
      .update({ html_content: enhancedHTML } as never)
      .eq("id", newVersionId);

    // Return a friendly text response (NOT the HTML!)
    const responseMessage = `I've applied your requested changes: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"

The preview on the right has been updated with a new version. You can:
• Review the changes in the preview
• Click "Apply Changes" to make this your current version
• Continue describing more changes you'd like to make

What else would you like to adjust?`;

    // Stream the text response for a nice UX
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send the response in small chunks for a typing effect
        const words = responseMessage.split(" ");
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 30)); // Small delay for typing effect
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-New-Version-Id": newVersionId,
      },
    });
  } catch (error) {
    console.error("Refinement error:", error);

    // Return 401 for authentication errors
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to refine website" }, { status: 500 });
  }
}
