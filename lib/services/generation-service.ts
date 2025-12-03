import { generateText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { GENERATION_SYSTEM_PROMPT, generatePrompt } from "@/lib/ai/prompts/generation";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import * as documentService from "./document-service";

interface GenerationInput {
  siteId: string;
  userId: string;
  conversationId?: string;
}

export async function generateWebsite(input: GenerationInput) {
  const { siteId, userId, conversationId } = input;

  try {
    logger.info("Starting website generation", { siteId, userId });

    // Get site details
    const supabase = await createClient();
    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("user_id", userId)
      .single();

    if (!site) {
      throw new Error("Site not found");
    }

    // Get FULL document content (not just summaries)
    const documents = await documentService.getDocumentsForSite(siteId);
    const fullDocumentText = documents
      .filter((d) => d.extracted_text)
      .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
      .join("\n\n");

    const documentSummaries = documents
      .filter((d) => d.summary)
      .map((d) => d.summary)
      .join("\n\n");

    // Get conversation messages to extract requirements
    let requirements: Record<string, unknown> = {};
    if (conversationId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sequence_number");

      // Extract requirements from conversation
      const conversationText = messages
        ?.filter((m) => (m as { role: string }).role === "user")
        .map((m) => (m as { content: string }).content)
        .join(" ");

      const siteData = site as { site_type?: string; target_audience?: string; main_goal?: string };

      requirements = {
        websiteType: siteData.site_type || "landing page",
        targetAudience: siteData.target_audience,
        mainGoal: siteData.main_goal,
        businessDescription: conversationText,
        documentContent: fullDocumentText,
        documentSummary: documentSummaries,
      };
    } else {
      requirements = {
        websiteType: "landing page",
        documentContent: fullDocumentText,
        documentSummary: documentSummaries,
      };
    }

    // Generate website code
    const startTime = Date.now();

    const { text: htmlContent } = await generateText({
      model: defaultGenerationModel,
      system: GENERATION_SYSTEM_PROMPT,
      prompt: generatePrompt(requirements),
      temperature: 0.7,
    });

    const generationTime = Date.now() - startTime;

    // Save as version
    const { data: version, error: versionError } = await supabase
      .from("site_versions")
      .insert({
        site_id: siteId,
        version_number: 1, // First version
        html_content: htmlContent,
        generation_type: "initial",
        ai_provider: "openai",
        model: "gpt-4o",
        generation_time_ms: generationTime,
        created_by: userId,
        prompt_context: requirements,
      } as never)
      .select()
      .single();

    if (versionError || !version) {
      console.error("Failed to save version:", versionError);
      throw new Error(`Failed to save version: ${versionError?.message || "unknown error"}`);
    }

    const versionId = (version as { id: string }).id;

    // Update site with current version
    await supabase
      .from("sites")
      .update({
        current_version_id: versionId,
        status: "generated",
      } as never)
      .eq("id", siteId);

    logger.info("Website generated successfully", {
      siteId,
      versionId,
      generationTime,
    });

    return {
      versionId,
      htmlContent,
      generationTime,
    };
  } catch (error) {
    logger.error("Website generation failed", error, { siteId, userId });
    throw error;
  }
}
