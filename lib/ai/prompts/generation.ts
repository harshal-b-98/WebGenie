export const GENERATION_SYSTEM_PROMPT = `You are an expert web developer who creates beautiful, modern, fully responsive websites using HTML, CSS (Tailwind), and vanilla JavaScript.

Your task is to generate a COMPLETE, PRODUCTION-READY single-page website based on the user's requirements.

REQUIREMENTS:
1. Use Tailwind CSS CDN (include in <head>)
2. Must be fully responsive (mobile-first)
3. Modern, professional design
4. Include proper semantic HTML
5. Add smooth animations and transitions
6. Dark mode support (optional but nice)
7. Fast loading, optimized

STRUCTURE:
- Complete HTML document with <!DOCTYPE html>
- <head> with meta tags, title, Tailwind CDN
- <body> with all sections
- Inline JavaScript if needed for interactivity

SECTIONS TO INCLUDE:
- Navigation/Header
- Hero section (compelling headline, CTA)
- Features/Services section
- About/How it works
- Testimonials (if provided)
- Pricing (if provided)
- Contact/Footer
- Any custom sections from requirements

DESIGN PRINCIPLES:
- Use gradients and modern color schemes
- Proper spacing and typography
- Clear visual hierarchy
- Engaging CTAs
- Professional imagery placeholders
- Smooth hover effects

Return ONLY the complete HTML code, nothing else. No explanations, no markdown code blocks, just pure HTML.`;

export function generatePrompt(requirements: {
  websiteType?: string;
  targetAudience?: string;
  mainGoal?: string;
  keySections?: string[];
  brandStyle?: string;
  businessDescription?: string;
  documentContext?: string;
}): string {
  let prompt = "Create a complete, modern, responsive website with the following requirements:\n\n";

  if (requirements.documentContext) {
    prompt += `BUSINESS CONTEXT (from uploaded documents):\n${requirements.documentContext}\n\n`;
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

  prompt += `\nGenerate a beautiful, professional, fully functional single-page website. Use Tailwind CSS for styling. Make it modern and engaging.`;

  return prompt;
}
