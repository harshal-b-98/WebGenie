// Widget Chat API
// Public endpoint for website visitors to ask questions
// Uses semantic search to answer from document knowledge base

import { NextResponse } from "next/server";
import { streamText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";
import { createClient } from "@/lib/db/server";
import * as semanticSearchService from "@/lib/services/semantic-search-service";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
  try {
    const { projectId, message, conversationHistory } = await request.json();

    if (!projectId || !message) {
      return NextResponse.json(
        { error: { message: "projectId and message are required" } },
        { status: 400 }
      );
    }

    logger.info("Widget chat request", { projectId, message: message.substring(0, 50) });

    // Verify project exists and get site info
    const supabase = await createClient();
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, title, description")
      .eq("id", projectId)
      .single();

    if (siteError || !site) {
      logger.error("Site not found for widget chat", { projectId });
      return NextResponse.json({ error: { message: "Project not found" } }, { status: 404 });
    }

    const siteName = (site as { title: string }).title;

    // Perform semantic search to find relevant content
    logger.info("Performing semantic search", { projectId, query: message });

    const relevantChunks = await semanticSearchService.semanticSearch(projectId, message, {
      limit: 10,
      threshold: 0.7,
    });

    logger.info("Semantic search complete", {
      projectId,
      resultsFound: relevantChunks.length,
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

    return result.toTextStreamResponse();
  } catch (error) {
    logger.error("Widget chat failed", error);
    console.error("Widget chat error:", error);

    return NextResponse.json(
      {
        error: {
          message: "Sorry, I'm having trouble right now. Please try again in a moment.",
        },
      },
      { status: 500 }
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
