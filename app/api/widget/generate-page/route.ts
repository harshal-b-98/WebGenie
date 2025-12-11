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
import { detectPersona, type PersonaSignals } from "@/lib/ai/prompts/personas";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";

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
    const body = await request.json();

    const { siteId, pageType, segment, topic, sessionId, behaviorSignals } = body as {
      siteId: string;
      pageType: "segment" | "detail";
      segment?: "features" | "solutions" | "platform" | "faq";
      topic?: string;
      sessionId?: string;
      behaviorSignals?: PersonaSignals;
    };

    // Validate required fields
    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!pageType || !["segment", "detail"].includes(pageType)) {
      return NextResponse.json(
        { error: "pageType must be 'segment' or 'detail'" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (pageType === "segment" && !segment) {
      return NextResponse.json(
        { error: "segment is required for segment pages" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (pageType === "detail" && (!segment || !topic)) {
      return NextResponse.json(
        { error: "segment and topic are required for detail pages" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if site exists and has dynamic pages enabled
    const supabase = await createClient();
    const { data: siteRow } = await supabase
      .from("sites")
      .select("id, dynamic_pages_enabled, persona_detection_enabled")
      .eq("id", siteId)
      .single();

    if (!siteRow) {
      return NextResponse.json({ error: "Site not found" }, { status: 404, headers: corsHeaders });
    }

    // Type cast for TypeScript
    const site = siteRow as {
      id: string;
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
    };

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
      segment,
      topic,
      sessionId,
      persona: detectedPersona,
      behaviorSignals,
    };

    const result = await generateDynamicPage(input);

    logger.info("Dynamic page request completed", {
      siteId,
      pageType,
      segment,
      topic,
      cached: result.cached,
      generationTime: result.generationTime,
      persona: result.persona,
    });

    return NextResponse.json(
      {
        html: result.html,
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
