/**
 * API Route: Generate Dynamic Page
 *
 * POST /api/widget/generate-page
 *
 * Generates segment or detail pages on-demand for progressive UI.
 * Called by the client-side nav-controller.js when user navigates.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDynamicPage, type GeneratePageInput } from "@/lib/services/dynamic-page-service";
import { detectPersona } from "@/lib/ai/prompts/personas";
import { type SegmentType } from "@/lib/ai/prompts/pages";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { generatePageRequestSchema, formatZodErrors } from "@/lib/validation";
import { ZodError } from "zod";
import { memoryCache, CacheKeys } from "@/lib/cache";
import { injectChatWidget, type ChatWidgetConfig } from "@/lib/utils/widget-injection";

// Service client for public widget access (bypasses RLS)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// CORS headers for widget requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate with Zod schema
    let validatedData;
    try {
      validatedData = generatePageRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Generate page validation failed", { issues: error.issues });
        return NextResponse.json(formatZodErrors(error), { status: 400, headers: corsHeaders });
      }
      throw error;
    }

    const { siteId, pageType, segment, topic, sessionId, behaviorSignals } = validatedData;

    // Check if site exists and has dynamic pages enabled (with caching)
    type SiteConfig = {
      id: string;
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
      chat_widget_enabled?: boolean;
      chat_widget_config?: Record<string, unknown>;
      current_version_id?: string;
    };

    const siteConfigKey = `${CacheKeys.site(siteId)}:config`;
    let site = memoryCache.sites.get(siteConfigKey) as SiteConfig | undefined;

    if (!site) {
      // Use service client for public widget access (bypasses RLS)
      const supabase = getServiceClient();
      const { data: siteRow, error: siteError } = await supabase
        .from("sites")
        .select(
          "id, dynamic_pages_enabled, persona_detection_enabled, chat_widget_enabled, chat_widget_config, current_version_id"
        )
        .eq("id", siteId)
        .single();

      if (siteError || !siteRow) {
        logger.error("Site not found for generate-page", { siteId, error: siteError });
        return NextResponse.json(
          { error: "Site not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      site = siteRow as SiteConfig;
      memoryCache.sites.set(siteConfigKey, site);
      logger.debug("Cached site config", { siteId });
    }

    // Detect persona from behavior signals if enabled
    let detectedPersona: "developer" | "executive" | "buyer" | "end_user" | "general" = "general";

    if (site.persona_detection_enabled && behaviorSignals) {
      const detection = detectPersona({
        pagesVisited: behaviorSignals.pagesVisited || [],
        timeOnSections: behaviorSignals.timeOnSections || {},
        clickedElements: behaviorSignals.clickedElements || [],
        scrollDepth: behaviorSignals.scrollDepth || {},
      });
      detectedPersona = detection.persona;

      logger.info("Persona detected", {
        siteId,
        persona: detectedPersona,
        confidence: detection.confidence,
      });
    }

    // Generate or retrieve the page
    const input: GeneratePageInput = {
      siteId,
      pageType,
      segment: segment as SegmentType | undefined,
      topic,
      sessionId,
      persona: detectedPersona,
      behaviorSignals,
    };

    const result = await generateDynamicPage(input);

    // Get chat widget settings (default: enabled)
    // This is CRITICAL to ensure widget appears on both cached and newly generated pages
    const chatWidgetEnabled = site.chat_widget_enabled ?? true;
    const chatWidgetConfig = site.chat_widget_config || {};
    const versionId = site.current_version_id || siteId;

    // RE-INJECT widget (handles both cached and new pages)
    let enhancedHtml = result.html;
    if (chatWidgetEnabled) {
      try {
        enhancedHtml = injectChatWidget(
          enhancedHtml,
          siteId,
          versionId,
          true, // inline mode for blob URL compatibility
          chatWidgetConfig as ChatWidgetConfig,
          "inline"
        );

        logger.debug("Chat widget re-injected into page", {
          siteId,
          cached: result.cached,
          htmlLengthBefore: result.html.length,
          htmlLengthAfter: enhancedHtml.length,
          hasWidget: enhancedHtml.includes("NEXTGENWEB_CONFIG"),
        });
      } catch (error) {
        logger.error("Failed to inject chat widget", { error, siteId, pageSlug: result.pageSlug });
        // GRACEFUL DEGRADATION: Return page without widget rather than failing
        enhancedHtml = result.html;
      }
    }

    logger.info("Dynamic page request completed", {
      siteId,
      pageType,
      segment,
      topic,
      cached: result.cached,
      generationTime: result.generationTime,
      persona: result.persona,
      widgetInjected: chatWidgetEnabled,
    });

    return NextResponse.json(
      {
        html: enhancedHtml, // Return enhanced HTML with widget
        pageSlug: result.pageSlug,
        cached: result.cached,
        generationTime: result.generationTime,
        persona: result.persona,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Failed to generate dynamic page", error);

    return NextResponse.json(
      { error: "Failed to generate page. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
