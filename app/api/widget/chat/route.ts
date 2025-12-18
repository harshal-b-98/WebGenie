// Widget Chat API
// Public endpoint for website visitors to ask questions
// Uses semantic search to answer from document knowledge base

import { NextResponse } from "next/server";
import { streamText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as semanticSearchService from "@/lib/services/semantic-search-service";
import { logger } from "@/lib/utils/logger";
import { widgetChatRequestSchema, formatZodErrors } from "@/lib/validation";
import { ZodError } from "zod";
import { memoryCache, CacheKeys, hashString } from "@/lib/cache";

// Create service role client for public widget access (bypasses RLS)
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
      validatedData = widgetChatRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Widget chat validation failed", { issues: error.issues });
        return NextResponse.json(formatZodErrors(error), { status: 400, headers: corsHeaders });
      }
      throw error;
    }

    const { projectId, message, conversationHistory } = validatedData;

    logger.info("Widget chat request", { projectId, message: message.substring(0, 50) });

    // Get site info (with caching)
    const siteKey = CacheKeys.site(projectId);
    let site = memoryCache.sites.get(siteKey) as
      | { id: string; title: string; description: string }
      | undefined;

    if (!site) {
      const supabase = getServiceClient();
      const { data: siteData, error: siteError } = await supabase
        .from("sites")
        .select("id, title, description")
        .eq("id", projectId)
        .single();

      if (siteError || !siteData) {
        logger.error("Site not found for widget chat", { projectId });
        return NextResponse.json(
          { error: { message: "Project not found" } },
          { status: 404, headers: corsHeaders }
        );
      }

      site = siteData as { id: string; title: string; description: string };
      memoryCache.sites.set(siteKey, site);
      logger.debug("Cached site data", { projectId });
    }

    const siteName = site.title;

    // Perform semantic search (with result caching for identical queries)
    const queryHash = hashString(message.toLowerCase().trim());
    const searchCacheKey = CacheKeys.embeddingSearch(projectId, queryHash);

    let relevantChunks = memoryCache.embeddings.get(searchCacheKey) as
      | Awaited<ReturnType<typeof semanticSearchService.semanticSearch>>
      | undefined;

    if (!relevantChunks) {
      logger.info("Performing semantic search", { projectId, query: message });

      relevantChunks = await semanticSearchService.semanticSearch(projectId, message, {
        limit: 10,
        threshold: 0.45, // Lowered from 0.7 - OpenAI text-embedding-3-small has different similarity distribution
      });

      // Cache search results for 5 minutes
      memoryCache.embeddings.set(searchCacheKey, relevantChunks);
      logger.debug("Cached semantic search results", { projectId, queryHash });
    } else {
      logger.debug("Using cached semantic search results", { projectId, queryHash });
    }

    logger.info("Semantic search complete", {
      projectId,
      resultsFound: relevantChunks.length,
      cached: !!memoryCache.embeddings.has(searchCacheKey),
    });

    // Build context from search results
    const context =
      relevantChunks.length > 0
        ? relevantChunks.map((chunk) => chunk.chunkText).join("\n\n")
        : "No specific information found.";

    // Build conversation history for AI
    const previousMessages = (conversationHistory || [])
      .slice(-6) // Last 3 exchanges (6 messages)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // System prompt for widget chat
    const systemPrompt = `You are a helpful AI assistant for ${siteName}.

Your role is to answer visitor questions about the products, services, and business using ONLY the information provided in the context below.

CRITICAL RULES:
1. Answer using ONLY the provided context
2. Be conversational and helpful
3. If the answer isn't in the context, say: "I don't have specific information about that in our documentation. Would you like to contact us directly?"
4. Keep responses concise (2-3 sentences typically)
5. Be professional but friendly
6. Never make up information
7. If unsure, admit it and offer to help differently

CONTEXT FROM BUSINESS DOCUMENTS:
${context}

Remember: Only use the context above to answer questions. Be helpful and conversational.`;

    // Stream AI response
    const result = streamText({
      model: defaultChatModel, // GPT-4o-mini for speed and cost
      system: systemPrompt,
      messages: [
        ...previousMessages,
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    logger.info("Streaming response to widget", { projectId });

    // Get the stream response and add CORS headers
    const streamResponse = result.toTextStreamResponse();

    // Create new response with CORS headers
    return new Response(streamResponse.body, {
      headers: {
        ...Object.fromEntries(streamResponse.headers.entries()),
        ...corsHeaders,
      },
    });
  } catch (error) {
    logger.error("Widget chat failed", error);
    console.error("Widget chat error:", error);

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
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
