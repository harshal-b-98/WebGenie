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
RESPONSIVE DESIGN (CRITICAL - MOBILE-FIRST)
================================================================================

ALL SECTIONS MUST BE FULLY RESPONSIVE:
- Typography: text-2xl sm:text-3xl md:text-4xl lg:text-5xl for headings
- Buttons: w-full sm:w-auto, flex-col sm:flex-row
- Touch targets: minimum py-4 on mobile
- Section padding: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8
- Max content width: max-w-3xl mx-auto for FAQ items

================================================================================
REQUIRED SECTIONS
================================================================================

1. NAVIGATION BAR (RESPONSIVE)
   - Fixed: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16

   DESKTOP NAV: class="hidden md:flex items-center gap-6"
   MOBILE HAMBURGER: <button id="mobile-menu-btn" class="md:hidden p-2"><i data-feather="menu" class="w-6 h-6"></i></button>
   MOBILE MENU:
   <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
     <div class="flex justify-between items-center p-4 border-b">
       <span class="font-bold text-lg">Menu</span>
       <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
     </div>
     <nav class="p-6 space-y-6"><!-- Nav links with py-3 --></nav>
   </div>

2. PAGE HEADER WITH BREADCRUMB (RESPONSIVE)
   - Dark gradient: from-slate-900 via-gray-900 to-slate-800
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

   RESPONSIVE BREADCRUMB HTML:
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-xs sm:text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">FAQ</li>
       </ol>
     </div>
   </nav>

   - RESPONSIVE H1: class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"
   - RESPONSIVE Subheading: class="text-base sm:text-lg lg:text-xl text-gray-300 mt-3 sm:mt-4"

3. FAQ CATEGORIES (RESPONSIVE - if enough questions)
   - Category buttons: class="flex flex-wrap gap-2 sm:gap-3"
   - Each button: class="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm sm:text-base"

4. FAQ ACCORDION (RESPONSIVE)
   - Container: class="max-w-3xl mx-auto space-y-3 sm:space-y-4"
   - RESPONSIVE item: class="bg-white rounded-xl shadow-lg p-4 sm:p-5 lg:p-6"
   - Question header: class="text-base sm:text-lg font-semibold py-3 sm:py-4"
   - Use Feather chevron-down icon (rotates on open)
   - Smooth animation
   - Touch-friendly tap targets

5. EXPLORE OTHER SECTIONS (RESPONSIVE)
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
   - Links with data-segment attributes

6. STILL HAVE QUESTIONS? (RESPONSIVE)
   - CTA buttons: class="flex flex-col sm:flex-row gap-4 justify-center"
   - Button: class="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-3 rounded-full"
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
