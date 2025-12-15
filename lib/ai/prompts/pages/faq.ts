/**
 * FAQ Segment Page Generation Prompt
 *
 * Generates an FAQ page with:
 * - Accordion-style Q&A
 * - Categorized questions
 * - Search functionality (optional)
 * - Contact CTA for unanswered questions
 */

export const FAQ_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating an FAQ page.

This page is generated when a visitor clicks "FAQ" from the segment explorer.
It should answer common questions extracted from the business documents.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter
- Vanilla JavaScript for accordion functionality
- NO placeholder content - use ONLY real Q&A from documents

================================================================================
ICON RULES (STRICTLY ENFORCED - NO EXCEPTIONS)
================================================================================

USE FEATHER ICONS ONLY:
- Syntax: <i data-feather="icon-name" class="w-5 h-5"></i>
- Call feather.replace() before </body>

FAQ ICONS: chevron-down (for accordion), help-circle, message-circle, mail
NEVER USE: <img> tags, placeholders, "?", emoji, external URLs

================================================================================
REQUIRED SECTIONS
================================================================================

1. NAVIGATION BAR
   - Fixed: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16
   - Structure: Logo LEFT, nav links CENTER-LEFT, CTA RIGHT
   - Navigation LEFT-ALIGNED

2. PAGE HEADER WITH BREADCRUMB
   - Dark gradient: from-slate-900 via-gray-900 to-slate-800
   - Padding: py-16 md:py-24

   EXACT BREADCRUMB HTML (copy this pattern):
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">FAQ</li>
       </ol>
     </div>
   </nav>

   - H1: text-4xl md:text-5xl font-bold text-white
   - Subheading: text-xl text-gray-300

3. FAQ CATEGORIES (if enough questions)
   - Group by topic
   - Category tabs/links

4. FAQ ACCORDION
   - Questions as clickable headers
   - Use Feather chevron-down icon (rotates on open)
   - Smooth animation
   - bg-white rounded-xl shadow-lg for each item

5. EXPLORE OTHER SECTIONS
   - Links with data-segment attributes

6. STILL HAVE QUESTIONS?
   - CTA: data-action="cta-primary" data-cta-type="contact"
   - Secondary: data-action="back-to-landing"

7. FOOTER (consistent)
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment

JAVASCRIPT: Include accordion with Feather icon rotation.

CRITICAL: Extract REAL Q&A from documents. Generate relevant questions if none explicit.

Return ONLY the complete HTML document.`;

export interface FAQPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
}

export function generateFAQPagePrompt(requirements: FAQPageRequirements): string {
  let prompt = `Generate a comprehensive FAQ page with accordion functionality.\n\n`;

  if (requirements.documentContent) {
    prompt += `EXTRACT Q&A FROM THIS CONTENT (or generate common questions based on it):\n`;
    prompt += `${requirements.documentContent.substring(0, 10000)}\n\n`;
  }

  if (requirements.companyName) {
    prompt += `COMPANY NAME: ${requirements.companyName}\n`;
  }

  if (requirements.logoUrl) {
    prompt += `LOGO URL: ${requirements.logoUrl}\n`;
  }

  if (requirements.brandColors) {
    prompt += requirements.brandColors;
  }

  if (requirements.personaEmphasis) {
    prompt += `\n${requirements.personaEmphasis}\n`;
  }

  prompt += `\nREQUIREMENTS:
1. Extract explicit Q&A from documents OR generate common questions
2. Implement working accordion with smooth animations
3. Group questions by category if there are many
4. Include "Contact Us" CTA for unanswered questions
5. Include breadcrumb navigation: Home > FAQ
6. Make accordion keyboard accessible with ARIA attributes

Generate the complete HTML now with working JavaScript accordion.`;

  return prompt;
}
