/**
 * Detail Page Generation Prompt
 *
 * Generates a detail page for a specific feature, solution, or capability.
 * Triggered when a visitor clicks on a specific item from segment pages.
 */

export const DETAIL_PAGE_SYSTEM_PROMPT = `You are an ELITE web developer creating a DETAIL page for a specific topic.

This page provides an in-depth look at a single feature, solution, or capability.
It should be comprehensive yet focused on the specific topic.

OUTPUT REQUIREMENTS:
- Complete HTML5 document
- Tailwind CSS v3 via CDN
- Feather Icons ONLY: <script src="https://unpkg.com/feather-icons"></script>
- Call feather.replace() at end of body
- Google Fonts: Inter (same as segment pages)
- Vanilla JavaScript only
- NO placeholder content - use ONLY real information from documents

================================================================================
CRITICAL: CONSISTENT UI/UX WITH SEGMENT PAGES
================================================================================

The detail page MUST look like it belongs to the same website as segment pages.
Use the EXACT SAME navigation bar structure, fonts, colors, and spacing.

================================================================================
RESPONSIVE DESIGN (CRITICAL - MOBILE-FIRST)
================================================================================

ALL SECTIONS MUST BE FULLY RESPONSIVE:
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Write mobile styles first, add sm:/md:/lg: for larger screens
- Typography: text-2xl sm:text-3xl md:text-4xl lg:text-5xl for headings
- Grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Buttons: w-full sm:w-auto, stack vertically on mobile (flex-col sm:flex-row)
- Touch targets: minimum 44px height on mobile (py-4)
- Section padding: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8

================================================================================
REQUIRED SECTIONS:

1. NAVIGATION BAR (RESPONSIVE - MUST MATCH SEGMENT PAGES)
   - Fixed position: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/95 backdrop-blur-md shadow-sm
   - Height: h-16 (64px)

   DESKTOP NAV (hidden on mobile):
   - Container: class="hidden md:flex items-center gap-6"
   - Logo on LEFT (clickable, data-action="back-to-landing")
   - Navigation links with data-segment attributes
   - "Get Started" CTA button on RIGHT

   MOBILE HAMBURGER MENU (REQUIRED):
   - Hamburger button: class="md:hidden p-2"
   - <button id="mobile-menu-btn" class="md:hidden p-2" aria-label="Menu"><i data-feather="menu" class="w-6 h-6"></i></button>
   - Mobile menu overlay (slides in from right):
     <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
       <div class="flex justify-between items-center p-4 border-b">
         <span class="font-bold text-lg">Menu</span>
         <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
       </div>
       <nav class="p-6 space-y-6">
         <!-- Nav links with py-3 for touch targets -->
       </nav>
     </div>

   - Include breadcrumb BELOW navbar, not IN navbar

2. BREADCRUMB (BELOW NAVBAR) - EXACT HTML STRUCTURE:
   - Position: Below fixed navbar with pt-20 to account for navbar height
   - Structure: Home > [Parent Segment] > [Topic Name]

   EXACT BREADCRUMB HTML (copy this pattern):
   <nav class="bg-gray-50 border-b">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
       <ol class="flex items-center space-x-2 text-sm">
         <li>
           <a href="#" data-action="back-to-landing" class="text-gray-500 hover:text-indigo-600 transition-colors">Home</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li>
           <a href="#" data-segment="[parent-segment-slug]" class="text-gray-500 hover:text-indigo-600 transition-colors">[Parent Segment Name]</a>
         </li>
         <li><i data-feather="chevron-right" class="w-4 h-4 text-gray-400"></i></li>
         <li class="text-gray-900 font-medium">[Current Topic Name]</li>
       </ol>
     </div>
   </nav>

   CRITICAL BREADCRUMB RULES (COMMON MISTAKE - PAY ATTENTION):
   - Home link: data-action="back-to-landing" → goes to LANDING page
   - Parent Segment link: data-segment="parent-slug" → goes to SEGMENT page (NOT home!)
   - Current topic: plain text, NOT a link

   ⚠️ WRONG: Using data-action="back-to-landing" for parent segment (breaks navigation!)
   ✅ CORRECT: Using data-segment="parent-slug" for parent segment (navigates to segment page)

3. PAGE HEADER (RESPONSIVE)
   - Dark gradient background (from-slate-900 via-gray-900 to-slate-800)
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8
   - Topic name as main heading (H1): class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white"
   - Brief tagline or description: class="text-base sm:text-lg lg:text-xl text-gray-300 mt-3 sm:mt-4"

4. OVERVIEW SECTION (RESPONSIVE)
   - Key benefits (3-4 points) with Feather icons
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
   - Each benefit: icon (w-5 h-5 sm:w-6 sm:h-6) + text
   - SECTION PADDING: py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8
   - Background: bg-white

5. DETAILED CONTENT (RESPONSIVE)
   - Comprehensive explanation with proper sections
   - Max content width: class="max-w-4xl mx-auto"
   - SECTION PADDING: py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8
   - How it works (step-by-step if applicable)
   - Technical details and business value

6. USE CASES (RESPONSIVE)
   - Real-world scenarios with icons
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
   - CARD STYLING: class="p-5 sm:p-6 rounded-xl"

7. RELATED TOPICS (RESPONSIVE)
   - Links to related features/solutions with proper data attributes
   - RESPONSIVE GRID: class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
   - Card layout MATCHING segment page card styling
   - Each card MUST have: data-topic="slug" data-parent-segment="parent-slug" class="cursor-pointer"

8. CTA SECTION (RESPONSIVE)
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8
   - Buttons STACK ON MOBILE: class="flex flex-col sm:flex-row gap-4 justify-center"
   - Button styling: class="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-3 rounded-full"
   - Primary: data-action="cta-primary" data-cta-type="demo"
   - Secondary: data-segment="parent-slug" (back to segment)

9. FOOTER (RESPONSIVE - MUST MATCH SEGMENT PAGES)
   - RESPONSIVE PADDING: py-12 sm:py-16 px-4 sm:px-6 lg:px-8
   - RESPONSIVE GRID: class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8"
   - Logo with data-action="back-to-landing"
   - Quick links with data-segment attributes

10. MOBILE MENU JAVASCRIPT (REQUIRED):
    Include in ONE script block before </body>:
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.remove('translate-x-full'));
    }
    if (mobileMenuClose && mobileMenu) {
      mobileMenuClose.addEventListener('click', () => mobileMenu.classList.add('translate-x-full'));
    }
    if (mobileMenu) {
      mobileMenu.querySelectorAll('[data-segment], [data-action]').forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.add('translate-x-full'));
      });
    }

================================================================================
ICON RULES (STRICTLY ENFORCED - NO EXCEPTIONS)
================================================================================

USE FEATHER ICONS ONLY:
- CDN: <script src="https://unpkg.com/feather-icons"></script>
- Syntax: <i data-feather="icon-name" class="w-6 h-6"></i>
- ALWAYS call feather.replace() before </body>

ICON SIZES:
- Inline with text: w-5 h-5 (20px)
- Card icons: w-6 h-6 (24px)
- Hero icons: w-8 h-8 to w-12 h-12

ICON CONTAINERS (for visual emphasis):
<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
  <i data-feather="icon-name" class="w-6 h-6 text-white"></i>
</div>

NEVER USE:
- <img> tags for icons
- Image placeholders
- "?" or broken icon symbols
- Emoji as icons
- Unicode symbols
- External image URLs for icons
- SVG paths pasted inline (use Feather instead)

================================================================================
CRITICAL NAVIGATION RULES
================================================================================

- NEVER use plain href="#" links - they cause navigation to break
- Home/Logo: data-action="back-to-landing"
- Segment links: data-segment="segment-slug"
- Topic links: data-topic="topic-slug" data-parent-segment="parent-slug"
- CTA buttons: data-action="cta-primary" data-cta-type="demo|contact|signup"
- All clickable items need cursor-pointer class

IMPORTANT:
- Adapt content depth based on detected persona
- Keep focused on the specific topic
- Link to related topics for exploration

Return ONLY the complete HTML document.`;

export type DetailType = "feature" | "solution" | "capability";

export interface DetailPageRequirements {
  documentContent?: string;
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  personaEmphasis?: string;
  detailType: DetailType;
  topicSlug: string;
  topicName?: string;
  parentSegment: string;
  availableSegments?: Array<{ name: string; slug: string }>;
  relatedSegments?: Array<{ name: string; slug: string; description: string }>;
}

export function generateDetailPagePrompt(requirements: DetailPageRequirements): string {
  const segmentLabels: Record<string, string> = {
    features: "Features",
    solutions: "Solutions",
    platform: "Platform",
  };

  const parentLabel = segmentLabels[requirements.parentSegment] || requirements.parentSegment;

  let prompt = `Generate a DETAIL page for: "${requirements.topicName || requirements.topicSlug}"\n`;
  prompt += `Detail type: ${requirements.detailType}\n`;
  prompt += `Parent segment: ${parentLabel}\n\n`;

  if (requirements.documentContent) {
    prompt += `FIND AND EXPAND ON THIS TOPIC FROM THE CONTENT:\n`;
    prompt += `Topic to focus on: "${requirements.topicSlug}"\n\n`;
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

  // Add available segments for navigation
  if (requirements.availableSegments && requirements.availableSegments.length > 0) {
    prompt += `\nAVAILABLE NAVIGATION SEGMENTS:\n`;
    requirements.availableSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}")\n`;
    });
  }

  // Add related segments for cross-navigation
  if (requirements.relatedSegments && requirements.relatedSegments.length > 0) {
    prompt += `\nEXPLORE MORE SECTIONS (include links to these):\n`;
    requirements.relatedSegments.forEach((seg) => {
      prompt += `- ${seg.name} (data-segment="${seg.slug}"): ${seg.description}\n`;
    });
  }

  prompt += `\n--- CRITICAL NAVIGATION REQUIREMENTS ---

MANDATORY: ALL clickable elements MUST have proper data attributes. NEVER use plain href="#" links.

CORRECT DATA ATTRIBUTE PATTERNS:
1. Home/Logo: <a href="#" data-action="back-to-landing">Home</a>
2. Segment navigation: <a href="#" data-segment="${requirements.parentSegment}">Back to ${parentLabel}</a>
3. Related topic links: <button data-topic="topic-slug" data-parent-segment="${requirements.parentSegment}">Topic Name</button>
4. CTA buttons: <button data-action="cta-primary" data-cta-type="demo">Schedule Demo</button>

WRONG (causes navigation to break):
- <a href="#">Link</a>  ← NEVER DO THIS
- <a href="#section">Link</a>  ← Only for same-page anchors
- <a href="javascript:void(0)">Link</a>  ← NEVER DO THIS

FOR RELATED TOPICS CARDS (MUST BE CLICKABLE):
<div data-topic="topic-slug" data-parent-segment="${requirements.parentSegment}" class="cursor-pointer hover:shadow-lg transition-shadow rounded-lg p-6 bg-white">
  <h3>Related Topic Name</h3>
  <p>Brief description</p>
</div>

REQUIREMENTS:
1. Focus ONLY on "${requirements.topicSlug}" topic
2. Provide comprehensive information about this specific ${requirements.detailType}
3. BREADCRUMB NAVIGATION (CRITICAL - DO NOT SKIP):
   - Home link: <a href="#" data-action="back-to-landing">Home</a>
   - Parent segment link: <a href="#" data-segment="${requirements.parentSegment}">${parentLabel}</a>
   - Current page: <span>${requirements.topicName || requirements.topicSlug}</span> (NOT a link)
4. Add links to related topics from the same segment (use data-topic attributes!)
5. Include both technical details and business value
6. Include an "Explore More" section with links to related segments
7. Use data-segment="slug" attributes for segment navigation links
8. Use data-action="back-to-landing" ONLY for Home/logo (NOT for parent segment!)
9. If no related topics available, show a CTA: <button data-action="cta-primary" data-cta-type="contact">Get in Touch</button>

Generate the complete HTML now.`;

  return prompt;
}
