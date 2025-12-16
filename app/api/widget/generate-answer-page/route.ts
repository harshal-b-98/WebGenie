/**
 * API Route: Generate Answer Page
 *
 * POST /api/widget/generate-answer-page
 *
 * Generates a visual answer page for a visitor's question.
 * Called by nav-controller.js after chat-with-page returns generatePage: true
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { generateAnswerPageRequestSchema, formatZodErrors } from "@/lib/validation";
import { ZodError } from "zod";
import { memoryCache, CacheKeys, hashString } from "@/lib/cache";
import { ANSWER_PAGE_SYSTEM_PROMPT, generateAnswerPagePrompt } from "@/lib/ai/prompts/pages/answer";
import {
  cleanGeneratedHTML,
  injectChatWidget,
  injectDynamicNav,
  type ChatWidgetConfig,
} from "@/lib/services/generation-service";

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

// Cache TTL for answer pages (60 minutes)
const ANSWER_PAGE_CACHE_TTL = 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
      validatedData = generateAnswerPageRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Generate answer page validation failed", { issues: error.issues });
        return NextResponse.json(formatZodErrors(error), { status: 400, headers: corsHeaders });
      }
      throw error;
    }

    const { projectId, question, questionSlug, questionTitle, content } = validatedData;

    logger.info("Generate answer page request", {
      projectId,
      questionSlug,
      contentLength: content.length,
    });

    // Check cache first
    const questionHash = hashString(question.toLowerCase().trim());
    const cacheKey = `answer_${projectId}_${questionHash}`;

    // Check in-memory cache
    const cachedPage = memoryCache.pages.get(cacheKey) as
      | { html: string; timestamp: number }
      | undefined;
    if (cachedPage && Date.now() - cachedPage.timestamp < ANSWER_PAGE_CACHE_TTL) {
      logger.info("Returning cached answer page", { projectId, questionSlug });
      return NextResponse.json(
        {
          html: cachedPage.html,
          pageSlug: `answer/${questionSlug}`,
          cached: true,
          generationTime: Date.now() - startTime,
        },
        { headers: corsHeaders }
      );
    }

    // Check database cache
    const supabase = getServiceClient();
    const { data: cachedDbPage } = await supabase
      .from("site_pages")
      .select("html_content, created_at")
      .eq("site_id", projectId)
      .eq("page_slug", `answer/${questionSlug}`)
      .single();

    if (cachedDbPage) {
      const cacheAge = Date.now() - new Date(cachedDbPage.created_at).getTime();
      if (cacheAge < ANSWER_PAGE_CACHE_TTL) {
        // Cache in memory for faster subsequent access
        memoryCache.pages.set(cacheKey, {
          html: cachedDbPage.html_content,
          timestamp: new Date(cachedDbPage.created_at).getTime(),
        });

        logger.info("Returning DB cached answer page", { projectId, questionSlug });
        return NextResponse.json(
          {
            html: cachedDbPage.html_content,
            pageSlug: `answer/${questionSlug}`,
            cached: true,
            generationTime: Date.now() - startTime,
          },
          { headers: corsHeaders }
        );
      }
    }

    // Get site info for branding and widget config (logo is stored in brand_assets.logo.url)
    const { data: siteData } = await supabase
      .from("sites")
      .select(
        "title, brand_assets, description, chat_widget_enabled, chat_widget_config, dynamic_pages_enabled, persona_detection_enabled, current_version_id"
      )
      .eq("id", projectId)
      .single();

    // Extract logo URL from brand_assets
    const brandAssets = (siteData?.brand_assets as { logo?: { url?: string } }) || {};
    const logoUrl = brandAssets.logo?.url || null;

    // Widget and navigation settings
    const chatWidgetEnabled = (siteData?.chat_widget_enabled as boolean) ?? true;
    const chatWidgetConfig = (siteData?.chat_widget_config as ChatWidgetConfig) || {};
    const dynamicPagesEnabled = (siteData?.dynamic_pages_enabled as boolean) ?? true;
    const personaDetectionEnabled = (siteData?.persona_detection_enabled as boolean) ?? false;
    const companyName = siteData?.title || "Company";
    const versionId = (siteData?.current_version_id as string) || projectId;

    logger.info("Site branding data for answer page", {
      projectId,
      hasLogo: !!logoUrl,
      companyName,
      chatWidgetEnabled,
      dynamicPagesEnabled,
    });

    // Get available segments for "explore more" links
    const { data: segments } = await supabase
      .from("site_content_structure")
      .select("name, slug")
      .eq("site_id", projectId)
      .eq("type", "segment")
      .limit(5);

    // Generate the answer page
    const userPrompt = generateAnswerPagePrompt({
      question,
      questionTitle,
      content,
      companyName: companyName || undefined,
      logoUrl: logoUrl || undefined,
      availableSegments: segments || undefined,
    });

    logger.info("Generating answer page with AI", { projectId, questionSlug });

    const result = await generateText({
      model: defaultGenerationModel,
      system: ANSWER_PAGE_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 8000,
    });

    // Clean the generated HTML
    let cleanedHTML = cleanGeneratedHTML(result.text);

    // Validate HTML (basic check)
    if (!cleanedHTML || cleanedHTML.length < 500) {
      logger.error("Generated answer page HTML too short", {
        projectId,
        length: cleanedHTML?.length,
      });
      throw new Error("Generated page content is too short");
    }

    // Inject chat widget if enabled
    if (chatWidgetEnabled) {
      cleanedHTML = injectChatWidget(
        cleanedHTML,
        projectId,
        versionId,
        chatWidgetEnabled,
        chatWidgetConfig
      );
      logger.info("Chat widget injected into answer page", { projectId });
    }

    // Inject dynamic navigation scripts if enabled
    if (dynamicPagesEnabled) {
      cleanedHTML = injectDynamicNav(
        cleanedHTML,
        projectId,
        versionId,
        companyName,
        personaDetectionEnabled
      );
      logger.info("Dynamic navigation injected into answer page", { projectId });
    }

    // Cache in memory
    memoryCache.pages.set(cacheKey, {
      html: cleanedHTML,
      timestamp: Date.now(),
    });

    // Cache in database (upsert)
    await supabase.from("site_pages").upsert(
      {
        site_id: projectId,
        page_slug: `answer/${questionSlug}`,
        page_type: "answer",
        html_content: cleanedHTML,
        metadata: {
          question,
          questionTitle,
          questionHash,
        },
        created_at: new Date().toISOString(),
      } as never,
      { onConflict: "site_id,page_slug" }
    );

    const generationTime = Date.now() - startTime;

    logger.info("Answer page generated successfully", {
      projectId,
      questionSlug,
      generationTime,
      htmlLength: cleanedHTML.length,
    });

    return NextResponse.json(
      {
        html: cleanedHTML,
        pageSlug: `answer/${questionSlug}`,
        cached: false,
        generationTime,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Failed to generate answer page", error);

    return NextResponse.json(
      { error: "Failed to generate answer page. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
