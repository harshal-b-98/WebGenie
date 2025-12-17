import { generateText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { GENERATION_SYSTEM_PROMPT, generatePrompt } from "@/lib/ai/prompts/generation";
import {
  LANDING_PAGE_SYSTEM_PROMPT,
  generateLandingPagePrompt,
} from "@/lib/ai/prompts/pages/landing";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import * as documentService from "./document-service";
import * as contentDiscoveryService from "./content-discovery-service";
import {
  extractColorsFromImage,
  generateColorPrompt,
  ExtractedColors,
} from "@/lib/utils/color-extractor";
// Import unified widget injection utility for inline mode support
import {
  injectChatWidget as injectChatWidgetInline,
  injectDynamicNav as injectDynamicNavInline,
  ChatWidgetConfig as WidgetConfig,
} from "@/lib/utils/widget-injection";

/**
 * Clean generated HTML by removing markdown code blocks and other AI artifacts
 * @param html - Raw HTML output from AI generation
 * @returns Cleaned HTML string
 */
export function cleanGeneratedHTML(html: string): string {
  if (!html) return "";

  let cleaned = html;

  // Remove markdown code blocks (```html ... ```)
  cleaned = cleaned.replace(/^```html?\n?/gim, "");
  cleaned = cleaned.replace(/\n?```$/gim, "");
  cleaned = cleaned.replace(/```$/gim, "");

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();

  // Ensure the HTML starts with <!DOCTYPE html> or <html>
  if (
    !cleaned.toLowerCase().startsWith("<!doctype") &&
    !cleaned.toLowerCase().startsWith("<html")
  ) {
    // Check if it starts with a valid HTML tag
    if (cleaned.startsWith("<")) {
      // Wrap in basic HTML structure if needed
      if (!cleaned.includes("<html")) {
        cleaned = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${cleaned}</body></html>`;
      }
    }
  }

  return cleaned;
}

// Re-export ChatWidgetConfig type for backward compatibility
export type { WidgetConfig as ChatWidgetConfig };

/**
 * Inject chat widget into generated HTML
 * Uses inline mode by default for blob URL compatibility
 * Exported for use in dynamic-page-service
 */
export function injectChatWidget(
  html: string,
  siteId: string,
  versionId: string,
  enabled: boolean,
  config: WidgetConfig
): string {
  // Don't inject if chat widget is disabled
  if (!enabled) {
    logger.info("Chat widget disabled, skipping injection", { siteId });
    return html;
  }

  // Use the unified injection utility with inline mode for blob URL compatibility
  return injectChatWidgetInline(html, siteId, versionId, enabled, config, "inline");
}

/**
 * Inject dynamic navigation scripts into generated HTML
 * Uses inline mode by default for blob URL compatibility
 * Exported for use in refine route
 */
export function injectDynamicNav(
  html: string,
  siteId: string,
  versionId: string,
  companyName: string,
  personaDetectionEnabled: boolean
): string {
  // Use the unified injection utility with inline mode for blob URL compatibility
  return injectDynamicNavInline(
    html,
    siteId,
    versionId,
    companyName,
    personaDetectionEnabled,
    "inline"
  );
}

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

    // Type cast for TypeScript
    const siteData = site as {
      id: string;
      title?: string;
      description?: string;
      brand_assets?: { logo?: { url?: string }; socialMedia?: Record<string, string> };
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
      chat_widget_enabled?: boolean;
      chat_widget_config?: WidgetConfig;
    };

    // Extract brand assets (logo, social media) from site
    const brandAssets = siteData.brand_assets || {};
    let logoUrl = brandAssets.logo?.url || null;

    // Normalize logo URL to use production Supabase URL (not localhost)
    // This ensures logos work in production deployments
    if (logoUrl && (logoUrl.includes("localhost") || logoUrl.includes("127.0.0.1"))) {
      const productionSupabaseUrl = "https://cfhssgueszhoracjeyou.supabase.co";
      logoUrl = logoUrl.replace(/http:\/\/(127\.0\.0\.1|localhost):[0-9]+/, productionSupabaseUrl);
      logger.info("Normalized logo URL from localhost to production", {
        original: brandAssets.logo?.url,
        normalized: logoUrl,
      });
    }

    const socialMedia = brandAssets.socialMedia || {};

    // Check dynamic page and persona settings
    const dynamicPagesEnabled = siteData.dynamic_pages_enabled ?? true;
    const personaDetectionEnabled = siteData.persona_detection_enabled ?? false;

    // Chat widget settings
    const chatWidgetEnabled = siteData.chat_widget_enabled ?? true;
    const chatWidgetConfig = siteData.chat_widget_config || {};

    // Website description from settings
    const websiteDescription = siteData.description || "";

    logger.info("Brand assets found", {
      hasLogo: !!logoUrl,
      socialMediaPlatforms: Object.keys(socialMedia).filter((k) => socialMedia[k]),
    });

    // Extract colors from logo if available
    let brandColors: ExtractedColors | null = null;
    let colorPromptSection = "";
    if (logoUrl) {
      try {
        logger.info("Extracting colors from logo", { logoUrl });
        brandColors = await extractColorsFromImage(logoUrl);
        if (brandColors) {
          colorPromptSection = generateColorPrompt(brandColors);
          logger.info("Brand colors extracted successfully", { brandColors });
        }
      } catch (error) {
        logger.warn("Failed to extract colors from logo", { error, logoUrl });
      }
    }

    // Get FULL document content (not just summaries)
    const documents = await documentService.getDocumentsForSite(siteId);

    console.log("Documents found for generation:", documents.length);
    console.log("Documents with text:", documents.filter((d) => d.extracted_text).length);

    const fullDocumentText = documents
      .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
      .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
      .join("\n\n");

    const documentSummaries = documents
      .filter((d) => d.summary && d.summary.trim().length > 0)
      .map((d) => d.summary)
      .join("\n\n");

    console.log("Full document text length:", fullDocumentText.length);
    console.log("Document summaries length:", documentSummaries.length);

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
        // Website description from settings
        websiteDescription: websiteDescription,
        // Brand assets from settings
        logoUrl: logoUrl,
        socialMedia: socialMedia,
        brandColors: colorPromptSection,
      };
    } else {
      requirements = {
        websiteType: "landing page",
        documentContent: fullDocumentText,
        documentSummary: documentSummaries,
        // Website description from settings
        websiteDescription: websiteDescription,
        // Brand assets from settings
        logoUrl: logoUrl,
        socialMedia: socialMedia,
        brandColors: colorPromptSection,
      };
    }

    // Generate website code
    const startTime = Date.now();

    // Choose prompt based on dynamic pages setting
    let systemPrompt: string;
    let userPrompt: string;

    if (dynamicPagesEnabled) {
      // Use minimal landing page prompt for progressive generation
      logger.info("Using minimal landing page prompt (dynamic pages enabled)");

      // Get AI-discovered content structure
      let contentStructure = null;
      try {
        contentStructure = await contentDiscoveryService.getContentStructure(siteId);
        if (contentStructure) {
          logger.info("Using AI-discovered content structure", {
            siteId,
            segments: contentStructure.segments.length,
            businessType: contentStructure.businessType,
          });
        } else {
          logger.info("No content structure found, will use defaults", { siteId });
        }
      } catch (error) {
        logger.warn("Failed to get content structure, using defaults", { error, siteId });
      }

      systemPrompt = LANDING_PAGE_SYSTEM_PROMPT;
      userPrompt = generateLandingPagePrompt({
        documentContent: requirements.documentContent as string | undefined,
        logoUrl: requirements.logoUrl as string | null | undefined,
        brandColors: requirements.brandColors as string | undefined,
        websiteType: requirements.websiteType as string | undefined,
        targetAudience: requirements.targetAudience as string | undefined,
        mainGoal: requirements.mainGoal as string | undefined,
        websiteDescription: requirements.websiteDescription as string | undefined,
        contentStructure: contentStructure,
        // Pass social media links from settings
        socialMedia: requirements.socialMedia as
          | {
              linkedin?: string;
              twitter?: string;
              facebook?: string;
              instagram?: string;
              youtube?: string;
            }
          | undefined,
      });
    } else {
      // Use full content-heavy prompt (legacy mode)
      logger.info("Using full generation prompt (dynamic pages disabled)");
      systemPrompt = GENERATION_SYSTEM_PROMPT;
      userPrompt = generatePrompt(requirements);
    }

    const { text: rawHtmlContent } = await generateText({
      model: defaultGenerationModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: dynamicPagesEnabled ? 8000 : 16000, // Smaller for minimal landing
    });

    const generationTime = Date.now() - startTime;

    // Clean up HTML - remove markdown code blocks if present
    let htmlContent = rawHtmlContent;

    // Remove markdown code block wrappers (```html ... ```)
    if (htmlContent.includes("```")) {
      htmlContent = htmlContent
        .replace(/^```html\s*/i, "") // Remove opening ```html
        .replace(/^```\s*/i, "") // Remove opening ``` without language
        .replace(/\s*```$/i, "") // Remove closing ```
        .trim();
    }

    // Ensure it starts with <!DOCTYPE or <html
    if (!htmlContent.startsWith("<!DOCTYPE") && !htmlContent.startsWith("<html")) {
      const doctypeIndex = htmlContent.indexOf("<!DOCTYPE");
      const htmlIndex = htmlContent.indexOf("<html");
      const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex >= 0 ? htmlIndex : 0;
      if (startIndex > 0) {
        htmlContent = htmlContent.substring(startIndex);
      }
    }

    logger.info("HTML cleaned", {
      originalLength: rawHtmlContent.length,
      cleanedLength: htmlContent.length,
      startsWithDoctype: htmlContent.startsWith("<!DOCTYPE"),
    });

    // Get next version number
    const { count } = await supabase
      .from("site_versions")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId);

    const nextVersionNumber = (count || 0) + 1;

    // Save as version (initially without widget)
    const { data: version, error: versionError } = await supabase
      .from("site_versions")
      .insert({
        site_id: siteId,
        version_number: nextVersionNumber,
        html_content: htmlContent,
        generation_type: nextVersionNumber === 1 ? "initial" : "refinement",
        ai_provider: "anthropic",
        model: "claude-sonnet-4.5",
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

    // NOW inject chat widget with correct versionId (only if enabled)
    let enhancedHtml = injectChatWidget(
      htmlContent,
      siteId,
      versionId,
      chatWidgetEnabled,
      chatWidgetConfig
    );

    // Inject dynamic navigation if enabled
    if (dynamicPagesEnabled) {
      const companyName = (site as { title?: string }).title || "Company";
      enhancedHtml = injectDynamicNav(
        enhancedHtml,
        siteId,
        versionId,
        companyName,
        personaDetectionEnabled
      );
      logger.info("Dynamic navigation injected", { siteId, versionId, personaDetectionEnabled });
    }

    // Update version with widget-enhanced HTML
    await supabase
      .from("site_versions")
      .update({
        html_content: enhancedHtml,
      } as never)
      .eq("id", versionId);

    // Update site with current version
    await supabase
      .from("sites")
      .update({
        current_version_id: versionId,
        status: "generated",
      } as never)
      .eq("id", siteId);

    logger.info("Website generated successfully with chat widget", {
      siteId,
      versionId,
      generationTime,
    });

    return {
      versionId,
      htmlContent: enhancedHtml,
      generationTime,
    };
  } catch (error) {
    logger.error("Website generation failed", error, { siteId, userId });
    throw error;
  }
}
