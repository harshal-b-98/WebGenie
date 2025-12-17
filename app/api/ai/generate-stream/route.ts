/**
 * API Route: Stream Website Generation
 *
 * POST /api/ai/generate-stream
 *
 * Uses Server-Sent Events (SSE) to stream website generation progress.
 * Sends events for skeleton, section progress, and completion.
 */

import { NextResponse } from "next/server";
import { streamText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import {
  LANDING_PAGE_SYSTEM_PROMPT,
  generateLandingPagePrompt,
} from "@/lib/ai/prompts/pages/landing";
import { GENERATION_SYSTEM_PROMPT, generatePrompt } from "@/lib/ai/prompts/generation";
import * as documentService from "@/lib/services/document-service";
import * as contentDiscoveryService from "@/lib/services/content-discovery-service";
import {
  extractColorsFromImage,
  generateColorPrompt,
  ExtractedColors,
} from "@/lib/utils/color-extractor";
// Import unified widget injection utility for inline mode support
import { injectChatWidget, injectDynamicNav, ChatWidgetConfig } from "@/lib/utils/widget-injection";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const user = await requireUser();
    const { siteId, conversationId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: { message: "siteId is required" } }, { status: 400 });
    }

    logger.info("Starting streaming website generation", { siteId, userId: user.id });

    // Get site details
    const supabase = await createClient();
    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    const siteData = site as {
      id: string;
      title?: string;
      description?: string;
      brand_assets?: { logo?: { url?: string }; socialMedia?: Record<string, string> };
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
      chat_widget_enabled?: boolean;
      chat_widget_config?: ChatWidgetConfig;
    };

    const brandAssets = siteData.brand_assets || {};
    const logoUrl = brandAssets.logo?.url || null;
    const socialMedia = brandAssets.socialMedia || {};
    const dynamicPagesEnabled = siteData.dynamic_pages_enabled ?? true;
    const personaDetectionEnabled = siteData.persona_detection_enabled ?? false;
    const chatWidgetEnabled = siteData.chat_widget_enabled ?? true;
    const chatWidgetConfig = siteData.chat_widget_config || {};
    const websiteDescription = siteData.description || "";

    // Extract brand colors
    let colorPromptSection = "";
    if (logoUrl) {
      try {
        const brandColors = await extractColorsFromImage(logoUrl);
        if (brandColors) {
          colorPromptSection = generateColorPrompt(brandColors);
        }
      } catch (error) {
        logger.warn("Failed to extract colors from logo", { error });
      }
    }

    // Get documents
    const documents = await documentService.getDocumentsForSite(siteId);
    const fullDocumentText = documents
      .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
      .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
      .join("\n\n");

    // Get conversation requirements
    let requirements: Record<string, unknown> = {};
    if (conversationId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sequence_number");

      const conversationText = messages
        ?.filter((m) => (m as { role: string }).role === "user")
        .map((m) => (m as { content: string }).content)
        .join(" ");

      const siteInfo = site as { site_type?: string; target_audience?: string; main_goal?: string };

      requirements = {
        websiteType: siteInfo.site_type || "landing page",
        targetAudience: siteInfo.target_audience,
        mainGoal: siteInfo.main_goal,
        businessDescription: conversationText,
        documentContent: fullDocumentText,
        websiteDescription,
        logoUrl,
        socialMedia,
        brandColors: colorPromptSection,
      };
    } else {
      requirements = {
        websiteType: "landing page",
        documentContent: fullDocumentText,
        websiteDescription,
        logoUrl,
        socialMedia,
        brandColors: colorPromptSection,
      };
    }

    // Get content structure for landing page
    let contentStructure = null;
    if (dynamicPagesEnabled) {
      try {
        contentStructure = await contentDiscoveryService.getContentStructure(siteId);
      } catch {
        // Ignore
      }
    }

    // Prepare prompts
    const systemPrompt = dynamicPagesEnabled
      ? LANDING_PAGE_SYSTEM_PROMPT
      : GENERATION_SYSTEM_PROMPT;
    const userPrompt = dynamicPagesEnabled
      ? generateLandingPagePrompt({
          documentContent: requirements.documentContent as string | undefined,
          logoUrl: requirements.logoUrl as string | null | undefined,
          brandColors: requirements.brandColors as string | undefined,
          websiteType: requirements.websiteType as string | undefined,
          targetAudience: requirements.targetAudience as string | undefined,
          mainGoal: requirements.mainGoal as string | undefined,
          websiteDescription: requirements.websiteDescription as string | undefined,
          contentStructure,
        })
      : generatePrompt(requirements);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        const startTime = Date.now();

        try {
          // Send skeleton structure first
          sendEvent("skeleton", {
            sections: ["header", "hero", "features", "cta", "footer"],
            message: "Initializing generation...",
          });

          // Send progress updates for different stages
          const stages = [
            { stage: "analyzing", message: "Analyzing your requirements...", progress: 10 },
            { stage: "designing", message: "Designing the layout...", progress: 25 },
            { stage: "generating", message: "Generating content...", progress: 40 },
          ];

          for (const stageInfo of stages) {
            sendEvent("progress", stageInfo);
            await new Promise((r) => setTimeout(r, 500));
          }

          // Stream the actual generation
          const { textStream } = streamText({
            model: defaultGenerationModel,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
            maxOutputTokens: dynamicPagesEnabled ? 8000 : 16000,
          });

          let fullHtml = "";
          let chunkCount = 0;
          const progressCheckpoints = [50, 60, 70, 80, 90];
          let currentCheckpoint = 0;

          for await (const chunk of textStream) {
            fullHtml += chunk;
            chunkCount++;

            // Send progress updates at checkpoints based on content length
            const estimatedProgress = Math.min(40 + (fullHtml.length / 80) * 0.5, 95);
            if (
              currentCheckpoint < progressCheckpoints.length &&
              estimatedProgress >= progressCheckpoints[currentCheckpoint]
            ) {
              const checkpoint = progressCheckpoints[currentCheckpoint];
              const messages = [
                "Creating visual elements...",
                "Building sections...",
                "Adding interactivity...",
                "Optimizing layout...",
                "Finalizing design...",
              ];
              sendEvent("progress", {
                stage: "building",
                message: messages[currentCheckpoint],
                progress: checkpoint,
              });
              currentCheckpoint++;
            }

            // Send HTML chunk every 20 tokens for live preview (throttled for performance)
            if (chunkCount % 20 === 0) {
              // Clean partial HTML for preview (remove markdown code block start if present)
              const previewHtml = fullHtml.replace(/^```html\s*/i, "").replace(/^```\s*/i, "");

              // Only send if we have substantial content (starts looking like HTML)
              if (previewHtml.includes("<") && previewHtml.length > 100) {
                sendEvent("html", {
                  partial: previewHtml,
                  length: previewHtml.length,
                  progress: Math.round(estimatedProgress),
                });
              }
            }
          }

          // Clean up HTML
          const htmlContent = fullHtml
            .replace(/^```html\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          // Get next version number
          const { count } = await supabase
            .from("site_versions")
            .select("*", { count: "exact", head: true })
            .eq("site_id", siteId);

          const nextVersionNumber = (count || 0) + 1;

          // Save initial version
          const { data: version, error: versionError } = await supabase
            .from("site_versions")
            .insert({
              site_id: siteId,
              version_number: nextVersionNumber,
              html_content: htmlContent,
              generation_type: "initial",
            } as never)
            .select()
            .single();

          if (versionError || !version) {
            throw new Error(`Failed to save version: ${versionError?.message || "unknown error"}`);
          }

          const versionData = version as { id: string };
          const versionId = versionData.id;

          // Inject chat widget and dynamic nav
          let enhancedHtml = injectChatWidget(
            htmlContent,
            siteId,
            versionId,
            chatWidgetEnabled,
            chatWidgetConfig
          );

          if (dynamicPagesEnabled) {
            const companyName = siteData.title || "Company";
            enhancedHtml = injectDynamicNav(
              enhancedHtml,
              siteId,
              versionId,
              companyName,
              personaDetectionEnabled
            );
          }

          // Update version with enhanced HTML
          await supabase
            .from("site_versions")
            .update({ html_content: enhancedHtml } as never)
            .eq("id", versionId);

          // Update site with current version
          await supabase
            .from("sites")
            .update({
              current_version_id: versionId,
              status: "generated",
            } as never)
            .eq("id", siteId);

          const generationTime = Date.now() - startTime;

          // Send completion event
          sendEvent("complete", {
            success: true,
            versionId,
            generationTime,
            htmlLength: enhancedHtml.length,
          });

          logger.info("Streaming generation complete", { siteId, versionId, generationTime });
        } catch (error) {
          logger.error("Streaming generation error", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Generation failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Failed to start streaming generation", error);
    return NextResponse.json({ error: { message: "Failed to start streaming" } }, { status: 500 });
  }
}
