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
export const defaultGenerationModel = openai("gpt-4o"); // GPT-4o for complex generation
export const defaultReasoningModel = openai("gpt-4o"); // For complex analysis
