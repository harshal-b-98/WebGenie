export const CLARIFICATION_SYSTEM_PROMPT = `You are a helpful AI assistant specialized in gathering website requirements. Your goal is to understand what kind of website the user wants to build through a brief, focused interview.

CRITICAL RULES:
- Ask MAXIMUM 4 questions total
- Be smart and efficient
- After 4 questions, you MUST say you're ready to build

If the user has uploaded documents:
1. Carefully analyze ALL document content first
2. Extract business info, target audience, value propositions
3. Only ask questions about critical gaps in information
4. If documents are comprehensive, ask only 1-2 questions

If NO documents uploaded:
1. Ask about website type and target audience (combined)
2. Ask about main goal/CTA
3. Ask about key sections needed
4. Ask about style preferences

ESSENTIAL INFORMATION NEEDED:
1. Website type (landing page, portfolio, etc.)
2. Target audience
3. Main call-to-action
4. 2-3 key sections/features

Be conversational and brief. Combine topics when possible.

After 3-4 questions, say something like:
"Perfect! I have everything I need. Let me build your website now. Click 'Generate Website' when you're ready!"

Then stop asking questions.`;

export const INTERVIEW_QUESTIONS = [
  {
    id: "website_basics",
    question: "What type of website do you need and who is it for?",
    followUp: "For example: 'A landing page for my SaaS targeting small business owners'",
  },
  {
    id: "main_goal",
    question: "What's the main action you want visitors to take?",
    examples: ["Sign up", "Contact you", "Buy a product", "Learn more"],
  },
  {
    id: "key_sections",
    question: "What key sections should the website have?",
    examples: ["Hero, Features, Pricing, Contact", "About, Services, Portfolio, Testimonials"],
  },
  {
    id: "brand_style",
    question:
      "Any specific brand colors or style preferences? (Optional - I can suggest based on your industry)",
  },
];

export function generateContextPrompt(
  messages: Array<{ role: string; content: string }>,
  documentSummaries?: string[]
): string {
  let context = CLARIFICATION_SYSTEM_PROMPT;

  if (documentSummaries && documentSummaries.length > 0) {
    context += `\n\nIMPORTANT: The user has uploaded ${documentSummaries.length} document(s). Here are the summaries:\n\n`;
    documentSummaries.forEach((summary, index) => {
      context += `Document ${index + 1}: ${summary}\n\n`;
    });
    context += `Based on these documents, you should already understand a lot about their business. Only ask questions about what's NOT clear from the documents. You may only need 1-2 questions total.`;
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  if (userMessageCount >= 3) {
    context += `\n\nIMPORTANT: The user has answered ${userMessageCount} questions. This should be enough. Confirm you have what you need and tell them you're ready to build their website. Do NOT ask more questions.`;
  }

  return context;
}

export function shouldCompleteInterview(messageCount: number, hasEnoughInfo: boolean): boolean {
  // Complete if we have 3+ messages and enough information
  // Or if we've asked 4+ questions regardless
  return (messageCount >= 3 && hasEnoughInfo) || messageCount >= 4;
}
