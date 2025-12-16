/**
 * Chat With Page API
 *
 * Enhanced chat endpoint that:
 * 1. Searches knowledge base for relevant content
 * 2. If found (relevance >= 0.5): Streams text summary + returns page generation data
 * 3. If not found: Returns "no data" message only
 *
 * Uses Server-Sent Events (SSE) for streaming.
 */

import { NextResponse } from "next/server";
import { streamText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as semanticSearchService from "@/lib/services/semantic-search-service";
import { logger } from "@/lib/utils/logger";
import { chatWithPageRequestSchema, formatZodErrors } from "@/lib/validation";
import { ZodError } from "zod";
import { memoryCache, CacheKeys, hashString } from "@/lib/cache";

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

// Minimum relevance threshold for page generation
const RELEVANCE_THRESHOLD = 0.5;

// Helper to create URL-safe slug from question
function createQuestionSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .substring(0, 60) // Limit length
    .replace(/-+$/, ""); // Remove trailing hyphens
}

// Helper to create short title for breadcrumb
function createQuestionTitle(question: string): string {
  // Remove question marks and limit length
  const cleaned = question.replace(/\?+$/, "").trim();
  if (cleaned.length <= 50) return cleaned;

  // Find a good break point
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 30 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Invalid JSON in request body" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate with Zod schema
    let validatedData;
    try {
      validatedData = chatWithPageRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Chat-with-page validation failed", { issues: error.issues });
        return NextResponse.json(formatZodErrors(error), { status: 400, headers: corsHeaders });
      }
      throw error;
    }

    const { projectId, message, conversationHistory } = validatedData;

    logger.info("Chat-with-page request", { projectId, message: message.substring(0, 50) });

    // Get site info (with caching)
    const siteKey = CacheKeys.site(projectId);
    let site = memoryCache.sites.get(siteKey) as
      | { id: string; title: string; description: string }
      | undefined;

    if (!site) {
      // Use service client for public widget access (bypasses RLS)
      const supabase = getServiceClient();
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("id, title, description")
        .eq("id", projectId)
        .single();

      if (siteError || !siteData) {
        logger.error("Site not found for chat-with-page", { projectId });
        return NextResponse.json(
          { error: { message: "Project not found" } },
          { status: 404, headers: corsHeaders }
        );
      }

      site = siteData as { id: string; title: string; description: string };
      memoryCache.sites.set(siteKey, site);
    }

    const siteName = site.title;

    // Perform semantic search (with result caching)
    const queryHash = hashString(message.toLowerCase().trim());
    const searchCacheKey = CacheKeys.embeddingSearch(projectId, queryHash);

    let relevantChunks = memoryCache.embeddings.get(searchCacheKey) as
      | Awaited<ReturnType<typeof semanticSearchService.semanticSearch>>
      | undefined;

    if (!relevantChunks) {
      logger.info("Performing semantic search", { projectId, query: message });

      relevantChunks = await semanticSearchService.semanticSearch(projectId, message, {
        limit: 10,
        threshold: 0.4, // Lower threshold to get more results, we'll filter by score
      });

      // Cache search results for 5 minutes
      memoryCache.embeddings.set(searchCacheKey, relevantChunks);
    }

    logger.info("Semantic search complete", {
      projectId,
      resultsFound: relevantChunks.length,
    });

    // Calculate average relevance score
    const avgRelevance =
      relevantChunks.length > 0
        ? relevantChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) /
          relevantChunks.length
        : 0;

    const shouldGeneratePage = avgRelevance >= RELEVANCE_THRESHOLD && relevantChunks.length > 0;

    logger.info("Relevance check", {
      projectId,
      avgRelevance,
      shouldGeneratePage,
      threshold: RELEVANCE_THRESHOLD,
    });

    // Build context from search results
    const context =
      relevantChunks.length > 0 ? relevantChunks.map((chunk) => chunk.chunkText).join("\n\n") : "";

    // Build conversation history
    const previousMessages = (conversationHistory || [])
      .slice(-6)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // Create question slug and title for page generation
    const questionSlug = createQuestionSlug(message);
    const questionTitle = createQuestionTitle(message);

    // Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!shouldGeneratePage) {
            // No relevant content - send a simple message
            const noDataMessage =
              "I don't have specific information about that in our knowledge base. Would you like to explore our main topics or contact us directly?";

            // Send the message as a summary event
            controller.enqueue(
              encoder.encode(
                `event: summary\ndata: ${JSON.stringify({ chunk: noDataMessage })}\n\n`
              )
            );

            // Send complete event without page generation
            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify({
                  generatePage: false,
                  relevanceScore: avgRelevance,
                  message: noDataMessage,
                })}\n\n`
              )
            );

            controller.close();
            return;
          }

          // Build system prompt for text summary
          const systemPrompt = `You are a helpful AI assistant for ${siteName}.

Your task is to provide a BRIEF, DIRECT answer to the visitor's question using the provided context.

IMPORTANT:
1. Keep your response to 2-4 sentences MAX
2. Be direct and answer the question immediately
3. Use ONLY the information from the context
4. Be conversational but concise
5. This is a SUMMARY - a full visual page will be generated next

CONTEXT FROM KNOWLEDGE BASE:
${context}

Remember: Brief, direct answer. A detailed page will follow.`;

          // Stream the text summary
          const result = streamText({
            model: defaultChatModel,
            system: systemPrompt,
            messages: [
              ...previousMessages,
              {
                role: "user",
                content: message,
              },
            ],
            temperature: 0.7,
            maxOutputTokens: 200, // Keep summary short
          });

          // Stream each chunk
          for await (const chunk of result.textStream) {
            controller.enqueue(
              encoder.encode(`event: summary\ndata: ${JSON.stringify({ chunk })}\n\n`)
            );
          }

          // Send complete event with page generation data
          controller.enqueue(
            encoder.encode(
              `event: complete\ndata: ${JSON.stringify({
                generatePage: true,
                relevanceScore: avgRelevance,
                content: context,
                questionSlug,
                questionTitle,
                question: message,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          logger.error("Streaming error", error);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: "An error occurred" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...corsHeaders,
      },
    });
  } catch (error) {
    logger.error("Chat-with-page failed", error);
    console.error("Chat-with-page error:", error);

    return NextResponse.json(
      {
        error: {
          message: "Sorry, I'm having trouble right now. Please try again in a moment.",
        },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
