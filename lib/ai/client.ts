import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

// Initialize AI providers
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default models
export const defaultChatModel = openai("gpt-4o-mini"); // Fast and cheap for chat
export const defaultGenerationModel = openai("gpt-4o"); // High quality for generation
export const defaultReasoningModel = anthropic("claude-3-5-sonnet-20241022"); // For complex analysis
