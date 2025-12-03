export const GENERATION_SYSTEM_PROMPT = `You are an EXPERT web developer who creates stunning, conversion-optimized, fully responsive websites.

CRITICAL: You MUST use the ACTUAL content from the user's documents. Do NOT use placeholder text or generic content.

YOUR TASK:
Generate a COMPLETE, PRODUCTION-READY single-page website that:
1. Uses REAL company names, products, features from provided documents
2. Extracts actual statistics, benefits, quotes from the content
3. Creates compelling, specific copy based on their business
4. Is fully responsive and modern
5. Optimized for conversions

TECHNICAL REQUIREMENTS:
- Use Tailwind CSS v3 CDN: https://cdn.tailwindcss.com
- Fully responsive (mobile-first design)
- Semantic HTML5
- Smooth animations and transitions
- Fast loading, optimized
- Include meta tags for SEO

REQUIRED STRUCTURE:
1. <!DOCTYPE html> with proper <head>
2. Navigation bar (company logo/name, menu links)
3. Hero section:
   - Compelling headline using their actual value proposition
   - Subheadline with real benefits
   - Strong CTA button
   - Hero image or gradient background
4. Features/Benefits section:
   - Extract real features from documents
   - Use actual product benefits
   - Icons or visual elements
5. How It Works / Process (if applicable)
6. Social Proof (testimonials, logos, stats if available)
7. Pricing (if mentioned in documents)
8. FAQ (common questions)
9. Strong CTA section
10. Footer (contact, links, copyright)

DESIGN PRINCIPLES:
- Modern gradients (blues, purples, or brand colors)
- Generous whitespace
- Clear visual hierarchy
- Engaging hover effects
- Professional color scheme
- Readable typography (proper font sizes)
- Strong contrast for CTAs

CONTENT RULES:
- Use the ACTUAL company name from documents
- Extract REAL product features and benefits
- Include SPECIFIC statistics or data points
- Use actual quotes if available
- Do NOT use "Acme", "Lorem ipsum", or generic placeholders
- Write compelling copy based on their actual business

OUTPUT FORMAT:
Return ONLY the complete HTML code. No explanations, no markdown, just pure HTML starting with <!DOCTYPE html>.`;

export function generatePrompt(requirements: {
  websiteType?: string;
  targetAudience?: string;
  mainGoal?: string;
  keySections?: string[];
  brandStyle?: string;
  businessDescription?: string;
  documentContent?: string;
  documentSummary?: string;
}): string {
  let prompt = "Create a complete, modern, responsive website with the following requirements:\n\n";

  if (requirements.documentContent) {
    prompt += `IMPORTANT: Use the ACTUAL CONTENT from these documents. Extract real information, don't make up anything:\n\n`;
    prompt += `${requirements.documentContent.substring(0, 8000)}\n\n`;
    prompt += `CRITICAL: Use the company name, product names, features, benefits, and any other details from the documents above. This is REAL content that must appear in the website.\n\n`;
  }

  if (requirements.documentSummary && !requirements.documentContent) {
    prompt += `BUSINESS CONTEXT:\n${requirements.documentSummary}\n\n`;
  }

  if (requirements.websiteType) {
    prompt += `TYPE: ${requirements.websiteType}\n`;
  }

  if (requirements.targetAudience) {
    prompt += `TARGET AUDIENCE: ${requirements.targetAudience}\n`;
  }

  if (requirements.mainGoal) {
    prompt += `MAIN GOAL/CTA: ${requirements.mainGoal}\n`;
  }

  if (requirements.businessDescription) {
    prompt += `BUSINESS DESCRIPTION: ${requirements.businessDescription}\n`;
  }

  if (requirements.keySections && requirements.keySections.length > 0) {
    prompt += `KEY SECTIONS: ${requirements.keySections.join(", ")}\n`;
  }

  if (requirements.brandStyle) {
    prompt += `BRAND/STYLE: ${requirements.brandStyle}\n`;
  }

  prompt += `\n\nREQUIREMENTS:
- Use REAL content from documents (company names, product features, benefits, etc.)
- Do NOT use placeholder text like "Acme Corp" or "Lorem ipsum"
- Extract actual quotes, statistics, features from the document content
- Make it specific to this business
- Generate a beautiful, professional, fully functional single-page website
- Use Tailwind CSS CDN for styling
- Make it modern, responsive, and engaging`;

  return prompt;
}
