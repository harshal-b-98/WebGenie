import { streamText } from "ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { defaultChatModel } from "@/lib/ai/client";
import * as conversationService from "@/lib/services/conversation-service";
import * as documentService from "@/lib/services/document-service";
import { generateContextPrompt } from "@/lib/ai/prompts/clarification";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { message, conversationId, siteId } = await request.json();

    if (!message || !siteId) {
      return NextResponse.json({ error: { message: "Missing required fields" } }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const history = await conversationService.getConversationHistory(conversationId);
      conversation = history.conversation;
    } else {
      conversation = await conversationService.startClarification(siteId, user.id);
    }

    if (!conversation) {
      throw new Error("Failed to get or create conversation");
    }

    // Save user message
    await conversationService.addUserMessage(conversation.id, message);

    // Get conversation history
    const { messages } = await conversationService.getConversationHistory(conversation.id);

    // Get document summaries if any
    const documents = await documentService.getDocumentsForSite(siteId);
    const documentSummaries = documents.filter((d) => d.summary).map((d) => d.summary!);

    // Generate AI response
    const result = streamText({
      model: defaultChatModel,
      system: generateContextPrompt(messages, documentSummaries),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      temperature: 0.7,
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
