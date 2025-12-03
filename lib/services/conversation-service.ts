import * as conversationRepository from "@/lib/repositories/conversation-repository";
import { logger } from "@/lib/utils/logger";

export async function startClarification(siteId: string, userId: string) {
  // Check for existing active conversation
  const existing = await conversationRepository.getActiveConversationForSite(
    siteId,
    "clarification"
  );

  if (existing) {
    logger.info("Resuming existing clarification conversation", {
      conversationId: existing.id,
      siteId,
    });
    return existing;
  }

  // Create new conversation
  const conversation = await conversationRepository.createConversation(
    siteId,
    userId,
    "clarification"
  );

  // Add initial system message
  await conversationRepository.addMessage(
    conversation.id,
    "system",
    "You are a helpful AI assistant that asks questions to understand what kind of website the user wants to build. Ask clear, specific questions about their business, target audience, and goals."
  );

  logger.info("Started new clarification conversation", { conversationId: conversation.id });
  return conversation;
}

export async function addUserMessage(conversationId: string, content: string) {
  return conversationRepository.addMessage(conversationId, "user", content);
}

export async function addAssistantMessage(
  conversationId: string,
  content: string,
  tokensUsed?: number
) {
  return conversationRepository.addMessage(conversationId, "assistant", content, tokensUsed);
}

export async function getConversationHistory(conversationId: string) {
  const conversation = await conversationRepository.getConversation(conversationId);
  const messages = await conversationRepository.getMessages(conversationId);

  return {
    conversation,
    messages,
  };
}

export async function completeConversation(conversationId: string) {
  await conversationRepository.updateConversationStatus(conversationId, "completed");
  logger.info("Conversation completed", { conversationId });
}
