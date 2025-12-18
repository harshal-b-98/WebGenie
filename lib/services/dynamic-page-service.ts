/**
 * Dynamic Page Generation Service
 *
 * Handles on-demand generation of segment and detail pages.
 * Supports caching, persona-aware content, and page hierarchy.
 */

import { generateText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import * as documentService from "./document-service";
import { injectChatWidget, type ChatWidgetConfig } from "./generation-service";
import {
  extractColorsFromImage,
  generateColorPrompt,
  ExtractedColors,
} from "@/lib/utils/color-extractor";

// Service client for public widget access (bypasses RLS)
// This is needed because dynamic pages are generated from widget context without auth
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Import prompts
import {
  getSystemPromptForPage,
  generateDetailPagePrompt,
  type PageType,
  type SegmentType,
} from "@/lib/ai/prompts/pages";

// Import dynamic segment detection
import {
  detectSegmentType,
  getSystemPromptForSegment,
  generateDynamicSegmentPrompt,
  formatSegmentName,
} from "@/lib/ai/prompts/dynamic-segment";

import { getPersonaEmphasis, type PersonaType } from "@/lib/ai/prompts/personas";

// Import content discovery for knowledge-aware generation
import {
  getContentStructure,
  getRelatedSegments,
  getTopicRelevantContent,
  getAvailableDetailPages,
} from "./content-discovery-service";

export interface GeneratePageInput {
  siteId: string;
  versionId?: string;
  pageType: PageType;
  segment?: SegmentType;
  topic?: string;
  sessionId?: string;
  persona?: PersonaType;
  behaviorSignals?: {
    pagesVisited?: string[];
    timeOnSections?: Record<string, number>;
    clickedElements?: string[];
    scrollDepth?: Record<string, number>;
  };
}

export interface GeneratePageResult {
  html: string;
  pageSlug: string;
  cached: boolean;
  generationTime: number;
  persona?: PersonaType;
}

/**
 * Clean up HTML - remove markdown code blocks if present
 */
function cleanHtml(rawHtml: string): string {
  let htmlContent = rawHtml;

  // Remove markdown code block wrappers
  if (htmlContent.includes("```")) {
    htmlContent = htmlContent
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
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

  return htmlContent;
}

/**
 * Validation result for HTML completeness check
 */
interface HtmlValidationResult {
  isValid: boolean;
  warnings: string[];
}

/**
 * Validate that generated HTML is not completely broken
 * LENIENT: Only fails for truly broken content, logs warnings for minor issues
 */
function validateHtmlCompleteness(html: string, pageType: PageType): HtmlValidationResult {
  const warnings: string[] = [];

  // Only fail if content is truly empty or broken
  if (!html || html.trim().length < 500) {
    return { isValid: false, warnings: ["HTML content is empty or too short"] };
  }

  // Log warnings for missing elements but don't fail
  if (!html.includes("</html>")) {
    warnings.push("Missing closing </html> tag");
  }

  if (!html.includes("</body>")) {
    warnings.push("Missing closing </body> tag");
  }

  // Check minimum length - warn but don't fail
  const minLength = pageType === "detail" ? 2000 : 3000;
  if (html.length < minLength) {
    warnings.push(`HTML shorter than expected (${html.length} chars)`);
  }

  return {
    isValid: true,
    warnings,
  };
}

/**
 * Inject dynamic navigation scripts into generated HTML
 * This enables navigation between pages in the dynamic UI system
 */
function injectDynamicNavScripts(
  html: string,
  siteId: string,
  versionId: string,
  companyName: string,
  personaDetectionEnabled: boolean
): string {
  // Remove trailing slash to prevent double-slash URLs (e.g., https://example.com//api)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1729").replace(/\/+$/, "");

  const navCode = `
  <!-- NextGenWeb Dynamic Navigation -->
  <link rel="stylesheet" href="${appUrl}/dynamic-nav/styles.css">
  <script>
    window.NEXTGENWEB_NAV_CONFIG = {
      siteId: '${siteId}',
      versionId: '${versionId}',
      apiEndpoint: '${appUrl}/api/widget',
      personaDetectionEnabled: ${personaDetectionEnabled},
      companyName: '${companyName.replace(/'/g, "\\'")}'
    };
  </script>
  <script src="${appUrl}/dynamic-nav/nav-controller.js" defer></script>
  <!-- End NextGenWeb Dynamic Navigation -->
`;

  // Inject before closing </body> tag
  if (html.includes("</body>")) {
    return html.replace("</body>", `${navCode}</body>`);
  }

  // Fallback: append at end
  return html + navCode;
}

/**
 * Generate a page slug from segment and topic
 */
function generatePageSlug(pageType: PageType, segment?: string, topic?: string): string {
  if (pageType === "landing") {
    return "landing";
  }

  if (pageType === "segment" && segment) {
    return segment;
  }

  if (pageType === "detail" && segment && topic) {
    return `${segment}/${topic}`;
  }

  return "page";
}

/**
 * Check cache for existing page
 * Also validates cached content - if invalid, deletes from cache and returns null
 */
async function checkCache(
  supabase: SupabaseClient,
  siteId: string,
  pageSlug: string,
  pageType: PageType,
  persona?: PersonaType
): Promise<string | null> {
  const { data: cachedPage } = await supabase
    .from("site_pages")
    .select("html_content, cache_expires_at")
    .eq("site_id", siteId)
    .eq("page_slug", pageSlug)
    .eq("persona_type", persona || "general")
    .single();

  if (cachedPage) {
    const page = cachedPage as { cache_expires_at: string | null; html_content: string };
    const expiresAt = page.cache_expires_at ? new Date(page.cache_expires_at) : null;
    if (!expiresAt || expiresAt > new Date()) {
      // Validate cached content - only reject if truly broken
      const validation = validateHtmlCompleteness(page.html_content, pageType);

      if (!validation.isValid) {
        logger.warn("Cached page invalid - invalidating cache", {
          siteId,
          pageSlug,
          persona,
          warnings: validation.warnings,
          htmlLength: page.html_content.length,
        });

        // Delete the invalid cached page
        await supabase
          .from("site_pages")
          .delete()
          .eq("site_id", siteId)
          .eq("page_slug", pageSlug)
          .eq("persona_type", persona || "general");

        return null; // Force regeneration
      }

      logger.info("Cache hit for page", { siteId, pageSlug, persona });
      return page.html_content;
    }
  }

  return null;
}

/**
 * Save page to cache
 */
async function saveToCache(
  supabase: SupabaseClient,
  siteId: string,
  pageSlug: string,
  pageType: PageType,
  segmentType: SegmentType | null,
  topic: string | null,
  html: string,
  persona: PersonaType | null,
  generationTimeMs: number
): Promise<void> {
  // Cache expires in 1 hour for segment pages, 30 minutes for detail pages
  const cacheMinutes = pageType === "segment" ? 60 : 30;
  const cacheExpiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000);

  try {
    await supabase.from("site_pages").upsert(
      {
        site_id: siteId,
        page_type: pageType,
        page_slug: pageSlug,
        segment_type: segmentType,
        topic_slug: topic,
        html_content: html,
        persona_type: persona || "general",
        generation_time_ms: generationTimeMs,
        cache_expires_at: cacheExpiresAt.toISOString(),
        ai_provider: "anthropic",
        model: "claude-sonnet-4.5",
      } as never,
      {
        onConflict: "site_id,page_slug,persona_type",
      }
    );

    logger.info("Page saved to cache", { siteId, pageSlug, persona, cacheExpiresAt });
  } catch (error) {
    logger.warn("Failed to save page to cache", { error, siteId, pageSlug });
  }
}

/**
 * Generate a dynamic page (segment or detail)
 */
export async function generateDynamicPage(input: GeneratePageInput): Promise<GeneratePageResult> {
  const { siteId, versionId, pageType, segment, topic, sessionId, persona, behaviorSignals } =
    input;

  const pageSlug = generatePageSlug(pageType, segment, topic);

  logger.info("Generating dynamic page", { siteId, pageType, segment, topic, pageSlug, persona });

  // Use service client for public widget access (bypasses RLS)
  const supabase = getServiceClient();

  // Get site details
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .single();

  if (siteError || !site) {
    logger.error("Site not found in dynamic page generation", { siteId, error: siteError });
    throw new Error("Site not found");
  }

  // Check cache first (unless persona detection changes output)
  const effectivePersona = persona || "general";
  const cachedHtml = await checkCache(supabase, siteId, pageSlug, pageType, effectivePersona);
  if (cachedHtml) {
    return {
      html: cachedHtml,
      pageSlug,
      cached: true,
      generationTime: 0,
      persona: effectivePersona,
    };
  }

  // Extract brand assets
  const siteData = site as { brand_assets?: { logo?: { url?: string } }; title?: string };
  const brandAssets = siteData.brand_assets || {};
  const logoUrl = brandAssets.logo?.url || null;

  // Extract colors from logo if available
  let colorPromptSection = "";
  if (logoUrl) {
    try {
      const brandColors: ExtractedColors | null = await extractColorsFromImage(logoUrl);
      if (brandColors) {
        colorPromptSection = generateColorPrompt(brandColors);
      }
    } catch (error) {
      logger.warn("Failed to extract colors from logo", { error, logoUrl });
    }
  }

  // Get document content
  const documents = await documentService.getDocumentsForSite(siteId);
  const documentContent = documents
    .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
    .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
    .join("\n\n");

  // Get persona emphasis if persona is detected
  const personaEmphasis =
    effectivePersona !== "general" ? getPersonaEmphasis(effectivePersona) : "";

  // Get content structure for knowledge-aware generation (Phase 4)
  const contentStructure = await getContentStructure(siteId);
  const availableSegments =
    contentStructure?.segments.map((s) => ({
      name: s.name,
      slug: s.slug,
    })) || [];

  // Get related segments for cross-navigation
  const relatedSegments = segment ? await getRelatedSegments(siteId, segment, 3) : [];

  // Get available detail pages to prevent linking to non-existent content
  const availableDetailPages = await getAvailableDetailPages(siteId);

  // Prepare prompt based on page type
  const companyName = siteData.title || "Company";
  // Use dynamic segment detection instead of hardcoded switch
  const detectedSegmentType = segment ? detectSegmentType(segment) : undefined;
  const systemPrompt =
    pageType === "segment" && detectedSegmentType
      ? getSystemPromptForSegment(detectedSegmentType)
      : getSystemPromptForPage(pageType, segment as SegmentType);

  let userPrompt: string;

  if (pageType === "segment" && segment) {
    // Use dynamic segment prompt generation - adapts to ANY segment type
    const segmentName = formatSegmentName(segment);

    // Get topic-relevant content for this segment
    const relevantContent = await getTopicRelevantContent(siteId, segment, 10000);
    const contentToUse = relevantContent || documentContent;

    userPrompt = generateDynamicSegmentPrompt(detectedSegmentType!, {
      documentContent: contentToUse,
      companyName,
      logoUrl,
      brandColors: colorPromptSection,
      personaEmphasis,
      segmentName,
      segmentSlug: segment,
      availableSegments,
      relatedSegments,
      availableDetailPages: Array.from(availableDetailPages),
    });

    logger.info("Using dynamic segment detection", {
      segment,
      detectedType: detectedSegmentType,
      segmentName,
      availableSegmentsCount: availableSegments.length,
      relatedSegmentsCount: relatedSegments.length,
    });
  } else if (pageType === "detail" && segment && topic) {
    // Get topic-specific content for detail pages
    const topicContent = await getTopicRelevantContent(siteId, topic, 8000);
    const contentToUse = topicContent || documentContent;

    userPrompt = generateDetailPagePrompt({
      documentContent: contentToUse,
      companyName,
      logoUrl,
      brandColors: colorPromptSection,
      personaEmphasis,
      detailType:
        segment === "features" ? "feature" : segment === "solutions" ? "solution" : "capability",
      topicSlug: topic,
      parentSegment: segment,
      availableSegments,
      relatedSegments,
    });
  } else {
    throw new Error(`Invalid page type or missing parameters: ${pageType}, ${segment}, ${topic}`);
  }

  // Generate the page
  const startTime = Date.now();

  const { text: rawHtml } = await generateText({
    model: defaultGenerationModel,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    maxOutputTokens: 8000, // Reduced from 12000 for efficiency
  });

  const generationTime = Date.now() - startTime;

  // Clean up HTML
  let cleanedHtml = cleanHtml(rawHtml);

  // Validate HTML - lenient, only fail if truly broken
  const validation = validateHtmlCompleteness(cleanedHtml, pageType);

  if (!validation.isValid) {
    logger.error("Generated HTML failed validation", {
      siteId,
      pageSlug,
      pageType,
      warnings: validation.warnings,
      htmlLength: cleanedHtml.length,
      generationTime,
    });

    throw new Error(`Page generation failed: ${validation.warnings.join("; ")}. Please try again.`);
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    logger.info("Generated HTML has warnings", {
      siteId,
      pageSlug,
      warnings: validation.warnings,
    });
  }

  // Get site settings for persona detection and chat widget
  const siteRow = site as {
    persona_detection_enabled?: boolean;
    chat_widget_enabled?: boolean;
    chat_widget_config?: ChatWidgetConfig;
  };
  const personaEnabled = siteRow.persona_detection_enabled ?? false;
  const chatWidgetEnabled = siteRow.chat_widget_enabled ?? true;
  const chatWidgetConfig = siteRow.chat_widget_config || {};

  // Inject dynamic navigation scripts so this page can navigate to other pages
  // Use versionId if provided, otherwise use siteId as fallback for cache key
  cleanedHtml = injectDynamicNavScripts(
    cleanedHtml,
    siteId,
    versionId || siteId,
    companyName,
    personaEnabled
  );

  // Inject chat widget if enabled (allows visitors to ask questions on dynamic pages too)
  cleanedHtml = injectChatWidget(
    cleanedHtml,
    siteId,
    versionId || siteId,
    chatWidgetEnabled,
    chatWidgetConfig
  );

  // Save to cache
  await saveToCache(
    supabase,
    siteId,
    pageSlug,
    pageType,
    segment || null,
    topic || null,
    cleanedHtml,
    effectivePersona,
    generationTime
  );

  // Update session if provided
  if (sessionId && behaviorSignals) {
    try {
      await supabase
        .from("visitor_sessions")
        .update({
          behavior_signals: behaviorSignals,
          detected_persona: effectivePersona,
          last_activity_at: new Date().toISOString(),
        } as never)
        .eq("session_token", sessionId);
    } catch (error) {
      logger.warn("Failed to update visitor session", { error, sessionId });
    }
  }

  logger.info("Dynamic page generated", {
    siteId,
    pageSlug,
    generationTime,
    persona: effectivePersona,
    htmlLength: cleanedHtml.length,
  });

  return {
    html: cleanedHtml,
    pageSlug,
    cached: false,
    generationTime,
    persona: effectivePersona,
  };
}

/**
 * Clear cached pages for a site
 */
export async function clearPageCache(siteId: string, pageSlug?: string): Promise<void> {
  // Use service client for consistency with other widget operations
  const supabase = getServiceClient();

  if (pageSlug) {
    await supabase.from("site_pages").delete().eq("site_id", siteId).eq("page_slug", pageSlug);
  } else {
    await supabase.from("site_pages").delete().eq("site_id", siteId);
  }

  logger.info("Page cache cleared", { siteId, pageSlug: pageSlug || "all" });
}
