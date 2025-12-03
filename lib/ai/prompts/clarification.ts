export const CLARIFICATION_SYSTEM_PROMPT = `You are a helpful AI assistant specialized in gathering website requirements. Your goal is to understand what kind of website the user wants to build through a conversational interview.

Ask clear, specific questions one at a time. Keep questions focused and relevant. Use the user's previous answers to ask better follow-up questions.

You should cover these key areas (but don't ask all at once):
1. Website type/purpose (landing page, portfolio, blog, e-commerce, etc.)
2. Target audience (who will visit this website?)
3. Main goal/CTA (what should visitors do?)
4. Key features/sections needed
5. Content requirements
6. Brand/style preferences
7. Reference websites (if any)

Keep your questions conversational and friendly. Don't overwhelm the user with too many questions at once.

After 6-8 questions (or when you have enough information), politely indicate that you have enough information to start building.`;

export const INTERVIEW_QUESTIONS = [
  {
    id: "website_type",
    question: "What type of website would you like to build?",
    examples: ["Landing page", "Portfolio", "Blog", "E-commerce", "Company website"],
  },
  {
    id: "target_audience",
    question: "Who is your target audience? Who will be visiting this website?",
    followUp: "Understanding your audience helps me create content that resonates with them.",
  },
  {
    id: "main_goal",
    question: "What's the main goal of this website? What action should visitors take?",
    examples: [
      "Sign up for a service",
      "Contact you",
      "Purchase a product",
      "Read content",
      "Download something",
    ],
  },
  {
    id: "key_sections",
    question: "What key sections or pages do you need?",
    examples: ["About", "Services", "Portfolio", "Pricing", "Testimonials", "Contact", "FAQ"],
  },
  {
    id: "brand_style",
    question: "Do you have any specific brand colors or style preferences?",
    followUp: "Or would you like me to suggest a style based on your industry?",
  },
  {
    id: "content",
    question: "Tell me about your business/product. What makes it unique?",
    followUp: "This will help me write compelling copy for your website.",
  },
  {
    id: "references",
    question: "Are there any websites you like that I should use as inspiration? (Optional)",
  },
];

export function generateContextPrompt(
  messages: Array<{ role: string; content: string }>,
  documentSummaries?: string[]
): string {
  let context = CLARIFICATION_SYSTEM_PROMPT;

  if (documentSummaries && documentSummaries.length > 0) {
    context += `\n\nThe user has uploaded documents. Here are the summaries:\n\n`;
    documentSummaries.forEach((summary, index) => {
      context += `Document ${index + 1}: ${summary}\n`;
    });
    context += `\nUse this information to ask more targeted questions and validate the user's requirements.`;
  }

  return context;
}

export function shouldCompleteInterview(messageCount: number, hasEnoughInfo: boolean): boolean {
  // Complete if we have 6+ messages and enough information
  // Or if we've asked 10+ questions regardless
  return (messageCount >= 6 && hasEnoughInfo) || messageCount >= 10;
}
