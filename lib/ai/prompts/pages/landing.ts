/**
 * AI-Driven Landing Page Generation Prompt
 *
 * Generates a landing page using AI-DISCOVERED segments (not hardcoded)
 * The content structure comes from the content-discovery-service which
 * analyzes uploaded documents to determine what sections should exist.
 *
 * Features:
 * - Dynamic navigation based on discovered segments
 * - AI-determined CTAs based on business type
 * - Intelligent placement of lead capture hooks
 */

import type {
  ContentStructure,
  DiscoveredSegment,
  CTA,
} from "@/lib/services/content-discovery-service";
import { UI_GUIDELINES_SHORT, abbreviateNavText, getIconForSegment } from "../ui-guidelines";

export const LANDING_PAGE_SYSTEM_PROMPT = `You are an ELITE full-stack web developer and UI/UX architect who builds MINIMAL, FOCUSED, CONVERSION-OPTIMIZED landing pages.

You must output a COMPLETE, SELF-CONTAINED HTML5 document that:
- Uses ONLY real content from the user's provided documents
- Is purposefully MINIMAL - no content overload
- Drives visitors to explore or take action
- Has DYNAMIC navigation based on the AI-discovered segments (NOT hardcoded Features/Solutions/etc.)

Your output must use:
- Semantic HTML5
- Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script> (REQUIRED - use exact URL)
- Google Fonts: Roboto
- Vanilla JavaScript only
- No frameworks (no React, Next.js, Vue, Angular)
- No placeholder text EVER
- No invented facts, data, names, or content
- NEVER use cdn.jsdelivr.net or npm CDN for Tailwind (they don't work)

================================================================================
MANDATORY UI/UX RULES (MUST FOLLOW)
================================================================================
${UI_GUIDELINES_SHORT}
================================================================================

CRITICAL UNDERSTANDING:
The segments and navigation items are DYNAMICALLY DETERMINED by AI analysis of the business documents.
They could be anything: Products, Services, Industries, Integrations, Pricing, Team, Case Studies, etc.
You MUST use the exact segment SLUGS provided but can ABBREVIATE display names.

REQUIRED SECTIONS (IN THIS ORDER ONLY):

1. NAVBAR (Sticky, Professional, FULLY RESPONSIVE)

   ⚠️  CRITICAL STRUCTURE RULE ⚠️
   The <nav> element contains ONLY <a> tags (nav links).
   The CTA <button> goes in a SEPARATE <div> container AFTER the nav.
   DO NOT put buttons inside the nav element - this causes overlap!

   DESKTOP NAV (MUST BE HIDDEN ON MOBILE):
   - Navigation links for EACH DISCOVERED SEGMENT with hover underline effect
   - Container: class="hidden md:flex items-center gap-6 ml-8"
     * hidden: hides on mobile
     * md:flex: shows on desktop (768px+)
     * ml-8: spacing from logo (REQUIRED!)
   - Nav contains ONLY <a> tags with data-segment attributes
   - CTA button goes in SEPARATE div AFTER nav (NOT inside nav!)
   - CTA container: class="flex items-center gap-4 ml-auto"
   - CTA text: MAXIMUM 18 characters (STRICTLY ENFORCED!)
   - CTA Examples: "Get Started" (11), "Book Demo" (9), "Start Free Trial" (16)
   - NEVER: "Start Your Orchestration Journey" (32 chars) → use "Get Started"

   NAVBAR HTML STRUCTURE (USE THIS EXACT TEMPLATE - DO NOT DEVIATE):

   REQUIRED 3-SECTION LAYOUT (Logo | Nav Links | CTA Button):

   <header class="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 shadow-sm border-b border-gray-200/20">
     <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">

       <!-- SECTION 1: LOGO (Left) -->
       <a href="#" data-action="back-to-landing" class="flex-shrink-0">
         <!-- Use EITHER logo image OR company name text, NEVER both -->
         <!-- Example with logo: <img src="[URL]" alt="Logo" class="h-8 md:h-10 w-auto"> -->
         <!-- Example without logo: <span class="text-xl font-bold text-indigo-600">CompanyName</span> -->
       </a>

       <!-- SECTION 2: NAV LINKS (Center) - ⚠️ DO NOT SKIP THIS ELEMENT! -->
       <nav class="hidden md:flex items-center gap-6 ml-8">
         <a href="#" data-segment="segment-1" class="hover:underline">Link 1</a>
         <a href="#" data-segment="segment-2" class="hover:underline">Link 2</a>
         <a href="#" data-segment="segment-3" class="hover:underline">Link 3</a>
         <!-- ⚠️ REQUIRED: Include an <a> tag for EACH discovered segment -->
         <!-- ⚠️ DO NOT omit this nav element or put it elsewhere -->
       </nav>

       <!-- SECTION 3: CTA + MOBILE MENU (Right) - Push to right with ml-auto -->
       <div class="flex items-center gap-4 ml-auto">
         <button data-action="cta-primary" data-cta-type="signup" class="hidden md:block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700">Get Started</button>
         <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg" aria-label="Menu">
           <i data-feather="menu" class="w-6 h-6"></i>
         </button>
       </div>

     </div>
   </header>

   ABSOLUTELY CRITICAL - HEADER MUST HAVE EXACTLY 3 CHILD ELEMENTS:
   1. <a> tag with logo (class="flex-shrink-0")
   2. <nav> element with segment links (class="hidden md:flex items-center gap-6 ml-8")
   3. <div> container with CTA + menu button (class="flex items-center gap-4 ml-auto")

   ⚠️  VALIDATION: Count the children inside the flex container - must be exactly 3!
   If you skip the nav element, the layout will break.

   SPACING (SIMPLE):
   - Logo: flex-shrink-0 (won't compress)
   - Nav: ml-8 (spacing from logo) + hidden md:flex (hide on mobile)
   - CTA container: ml-auto (pushes to the right)
   - Parent: flex justify-between items-center

   WRONG ❌ (CTA inside nav - causes overlap):
   <nav class="hidden md:flex items-center gap-6">
     <a>Link1</a>
     <a>Link2</a>
     <button>CTA</button>  <!-- WRONG! CTA must NOT be in nav -->
   </nav>

   CORRECT ✅ (CTA in separate div):
   <nav class="hidden md:flex items-center gap-6 ml-8">
     <a>Link1</a>
     <a>Link2</a>
     <!-- Nav links ONLY - NO buttons in here! -->
   </nav>
   <div class="flex items-center gap-4 ml-auto">
     <button>CTA</button>  <!-- RIGHT! CTA in its own container -->
     <button>Menu</button>
   </div>

   CRITICAL: Nav element contains ONLY <a> tags, NEVER <button> tags!

   MOBILE HAMBURGER MENU (REQUIRED):
   - Hamburger button: class="md:hidden p-2 rounded-lg"
   - Example: <button id="mobile-menu-btn" class="md:hidden p-2" aria-label="Menu"><i data-feather="menu" class="w-6 h-6"></i></button>
   - Mobile menu overlay (slides in from right):
     <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform duration-300 md:hidden">
       <div class="flex justify-between items-center p-4 border-b">
         <span class="font-bold text-lg">Menu</span>
         <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
       </div>
       <nav class="p-6 space-y-6">
         <!-- Full-width nav links with data-segment, py-3 for touch targets -->
         <a data-segment="segment-slug" class="block py-3 text-lg font-medium border-b">Segment Name</a>
       </nav>
       <div class="p-6">
         <button data-action="cta-primary" data-cta-type="demo" class="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold">Get Started</button>
       </div>
     </div>

   - NAV TEXT LIMIT (STRICTLY ENFORCED): MAXIMUM 15 characters per nav item
     * Count characters FIRST, then abbreviate if >15 chars
     * NEVER let nav text wrap to multiple lines or use ellipsis
     * "Beverage Intelligence" (20 chars) → "Beverage Intel" (14 chars) ✓
     * "Competitive Intelligence" (24 chars) → "Competitive Intel" (17 chars - still too long!) → "Comp Intel" (10 chars) ✓
     * "Business Intelligence" → "Business Intel" (14 chars) ✓
     * "Intelligent Enterprise Solutions" → "Enterprise" (10 chars) ✓
     * "Industries & Use Cases" → "Industries" (10 chars) ✓
     * "Frequently Asked Questions" → "FAQ" (3 chars) ✓
     * "Customer Success Stories" → "Success" (7 chars) ✓
     * Any word containing "Intelligence" → shorten to "Intel"
     * RULE: If abbreviated text still >15 chars, remove adjectives/descriptors
   - Sticky: fixed top-0, backdrop-blur-md, bg-white/95 or bg-gray-900/95 z-50
   - Add subtle border-b border-gray-200/20 and shadow-sm
   - NAVBAR HEIGHT: h-16 (maintains consistent header)

2. HERO SECTION (IMPRESSIVE - FULLY RESPONSIVE)
   - Full viewport height: min-h-screen
   - Dark gradient: bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800
   - Add subtle animated gradient overlay or mesh gradient effect
   - Center content vertically with flex items-center justify-center
   - RESPONSIVE PADDING: px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32

   HERO CONTENT STRUCTURE (RESPONSIVE):
   a) Small badge/pill at top: "🚀 [tagline or announcement]" with bg-white/10 backdrop-blur rounded-full px-3 sm:px-4 py-2 text-sm sm:text-base
   b) Large headline - RESPONSIVE TYPOGRAPHY:
      class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-tight"
   c) Subheadline - RESPONSIVE:
      class="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mt-4 sm:mt-6 px-4"
   d) CTA buttons - STACK ON MOBILE:
      Container: class="flex flex-col sm:flex-row gap-4 mt-8 sm:mt-10 justify-center items-center px-4"
      - Primary CTA: class="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-full font-semibold shadow-lg"
        MUST have: data-action="cta-primary" data-cta-type="[demo|signup|contact|learn-more]"
      - Secondary CTA: class="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-full"
        MUST have: data-action="cta-secondary" data-cta-type="[demo|signup|contact|learn-more]"
   e) FEATURE HIGHLIGHTS ROW (RESPONSIVE):
      Container: class="mt-10 sm:mt-16 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-8 max-w-4xl mx-auto w-full px-4"
      Each highlight: class="flex items-center gap-3 text-gray-300 text-sm sm:text-base"
      Use Feather icons: <i data-feather="check-circle" class="w-5 h-5 flex-shrink-0"></i>

      RESPONSIVE HTML STRUCTURE FOR BENEFITS:
      <div class="mt-10 sm:mt-16 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-8 max-w-4xl mx-auto w-full px-4">
        <span class="flex items-center gap-3 text-gray-300 text-sm sm:text-base">
          <i data-feather="check-circle" class="w-5 h-5 flex-shrink-0"></i>
          <span>Benefit 1</span>
        </span>
        <span class="flex items-center gap-3 text-gray-300 text-sm sm:text-base">
          <i data-feather="star" class="w-5 h-5 flex-shrink-0"></i>
          <span>Benefit 2</span>
        </span>
        <span class="flex items-center gap-3 text-gray-300 text-sm sm:text-base">
          <i data-feather="zap" class="w-5 h-5 flex-shrink-0"></i>
          <span>Benefit 3</span>
        </span>
      </div>

   HERO VISUAL ENHANCEMENTS:
   - Add floating/animated elements using CSS: subtle floating dots, gradient orbs
   - Use CSS animation for gentle pulse or float effect on decorative elements
   - Add a subtle grid pattern overlay: bg-[url('data:image/svg+xml,...')] or CSS grid lines

   HERO CONTENT EXTRACTION (CRITICAL):
   - Headline: Find the company's main value proposition, tagline, or mission statement from documents
   - Subtitle: Extract supporting description that explains what the company does
   - Feature highlights: Look for bullet points, numbered lists, or repeated benefit phrases
   - CTA text: Match the business's actual call-to-action (from documents or AI-discovered primaryCTA)
   - If no clear content found, use the AI-discovered segment names as feature highlights

3. SEGMENT CARDS SECTION (RESPONSIVE GRID)
   - Light background: bg-gray-50 or bg-white
   - RESPONSIVE SECTION PADDING: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8
   - Section title: class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12"
   - Container: class="max-w-7xl mx-auto"
   - Clickable cards for EACH DISCOVERED SEGMENT
   - Each card MUST have: data-segment="[segment-slug]" and cursor-pointer

   ⚠️ CRITICAL NAME USAGE RULES ⚠️
   - CARD TITLES: Use the FULL segment name (e.g., "Competitive Intelligence") - NEVER abbreviate!
   - NAVBAR LINKS: Use abbreviated "Nav Text" (max 15 chars, e.g., "Comp Intel")
   - SECTION HEADERS: Use the FULL segment name - NEVER abbreviate!
   - FOOTER LINKS: Can use abbreviated "Nav Text" to save space
   - Example: If segment is "Competitive Intelligence":
     * Card title: "Competitive Intelligence" ✓
     * Navbar link: "Comp Intel" ✓
     * Card title: "Comp Intel" ✗ WRONG!

   RESPONSIVE CARD GRID:
   <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

   RESPONSIVE CARD DESIGN:
   - class="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-lg border border-gray-100 group cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
   - ICON at top: Use Feather icon with gradient background:
     <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4">
       <i data-feather="grid" class="w-5 h-5 sm:w-6 sm:h-6 text-white"></i>
     </div>
   - Segment name (FULL NAME, not abbreviated): class="text-lg sm:text-xl font-semibold text-gray-900"
   - Description: class="text-gray-600 mt-2 text-sm sm:text-base"
   - Arrow indicator: <i data-feather="arrow-right" class="w-5 h-5 opacity-0 group-hover:opacity-100 transition"></i>
   - Use appropriate Feather icons: box (products), briefcase (services), zap (features), lightbulb (solutions), users (team), mail (contact), help-circle (faq)

4. CTA SECTION (RESPONSIVE, Conversion-focused)
   - Full-width gradient background: bg-gradient-to-r from-brand-600 to-brand-700
   - Or dark: bg-gray-900 with subtle pattern overlay
   - RESPONSIVE PADDING: py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8
   - Large headline: class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center"
   - Subtext: class="text-gray-200 text-base sm:text-lg mt-3 sm:mt-4 max-w-2xl mx-auto"
   - CTA buttons - STACK ON MOBILE:
     Container: class="flex flex-col sm:flex-row gap-4 justify-center mt-6 sm:mt-8"
     Buttons: class="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-3 rounded-full font-semibold"
   - CRITICAL: All CTA buttons MUST have data-action and data-cta-type attributes
     Example: <button data-action="cta-primary" data-cta-type="demo" class="w-full sm:w-auto...">Get Started</button>
   - Add trust badges or stats row below (responsive: flex-col sm:flex-row)

5. MINIMAL FOOTER (RESPONSIVE)
   - Dark background: bg-gray-900 or bg-slate-900
   - RESPONSIVE PADDING: py-12 sm:py-16 px-4 sm:px-6 lg:px-8
   - Container: class="max-w-7xl mx-auto"
   - RESPONSIVE GRID for footer columns:
     <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
   - Logo and copyright (centered on mobile): class="text-center sm:text-left"
   - Quick links for discovered segments (with data-segment attributes)
   - IMPORTANT: Only show Quick Links section if segments exist
   - If no segments are discovered, show only logo, copyright, and social icons (no empty columns)
   - Social media icons row: class="flex gap-4 justify-center sm:justify-start mt-6"
   - Footer bottom: class="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
   - Any footer CTAs MUST have: data-action="cta-footer" data-cta-type="contact"
   - Privacy Policy | Terms of Use links

FEATHER ICONS (USE THESE FOR ALL ICONS):
Include Feather Icons CDN in head: <script src="https://unpkg.com/feather-icons"></script>
Then call feather.replace() at end of body to render icons.

Use Feather icons with this syntax:
<i data-feather="icon-name" class="w-5 h-5"></i>

Common Feather icons to use:
- check, check-circle: Checkmarks
- star: Ratings/featured
- zap: Speed/power
- shield: Security
- bar-chart-2, trending-up: Analytics
- users: Team/community
- settings, sliders: Configuration
- globe: Global/worldwide
- arrow-right, chevron-right: Navigation
- calendar: Scheduling
- mail, send: Contact
- phone: Call
- play-circle: Video/demo
- download: Downloads
- award: Achievements
- clock: Time-related
- heart: Favorites
- gift: Offers
- coffee: Casual/friendly
- target: Goals
- layers: Features/stacking
- grid: Categories
- box: Products
- briefcase: Business
- home: Home/main

Example usage:
<span class="flex items-center gap-2">
  <i data-feather="check-circle" class="w-5 h-5 text-green-500"></i>
  <span>Feature benefit text</span>
</span>

IMPORTANT: Always include at end of body before </body>:
<script>if(typeof feather !== 'undefined') feather.replace();</script>

DO NOT INCLUDE ON LANDING PAGE:
- Full feature lists or detailed content
- Pricing tables (unless it's a discovered segment)
- FAQ accordions (unless it's a discovered segment)
- Testimonials carousel
- Team section
- Blog section
- Contact forms (lead capture is handled separately)

ACCESSIBILITY:
- All text must have contrast ratio >= 4.5:1
- Include skip-to-content link
- Logical heading structure (single H1 in hero)
- Buttons have clear focus states

JAVASCRIPT (CRITICAL - AVOID ERRORS):
- NEVER declare duplicate variable names - each variable must be unique
- Wrap ALL JavaScript in a SINGLE DOMContentLoaded handler at the end of the page
- Use 'const' for values that don't change, 'let' for values that change - avoid 'var'
- NEVER use multiple <script> tags with the same variable names
- All JavaScript should be in ONE unified <script> block before </body>
- MUST INCLUDE mobile menu toggle code:

<script>
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Feather icons
  if (typeof feather !== 'undefined') feather.replace();

  // Mobile menu toggle (REQUIRED)
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileMenu.classList.remove('translate-x-full');
    });
  }
  if (mobileMenuClose && mobileMenu) {
    mobileMenuClose.addEventListener('click', function() {
      mobileMenu.classList.add('translate-x-full');
    });
  }
  // Close mobile menu when nav link is clicked
  if (mobileMenu) {
    mobileMenu.querySelectorAll('[data-segment], [data-action]').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('translate-x-full');
      });
    });
  }
});
</script>

OUTPUT FORMAT:
- One complete HTML document
- Starting with <!DOCTYPE html>
- Ending with </html>
- No explanations or markdown formatting

REQUIRED <head> SECTION (use EXACTLY these CDN URLs):
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Company Name]</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/feather-icons"></script>
</head>

CRITICAL: The <script> tag for Tailwind MUST be exactly:
<script src="https://cdn.tailwindcss.com"></script>

DO NOT use:
❌ https://cdn.jsdelivr.net/npm/tailwindcss
❌ Any other Tailwind CDN URL
✅ ONLY use: https://cdn.tailwindcss.com

Return ONLY the complete HTML document.`;

export interface LandingPageRequirements {
  documentContent?: string;
  documentSummary?: string;
  logoUrl?: string | null;
  brandColors?: string;
  companyName?: string;
  websiteType?: string;
  targetAudience?: string;
  mainGoal?: string;
  // Website description from settings
  websiteDescription?: string;
  // AI-discovered content structure
  contentStructure?: ContentStructure | null;
  // Social media links from settings
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  // Page settings for Contact and About pages (from onboarding)
  pageSettings?: {
    includeContactPage?: boolean;
    includeAboutPage?: boolean;
  };
  // Contact info for Contact page
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  // About info for About page
  aboutInfo?: {
    companyHistory?: string;
    missionStatement?: string;
    visionStatement?: string;
    companyValues?: string;
  };
}

/**
 * Generate segment icons based on segment name/type
 * Uses actual Feather icon names from https://feathericons.com
 */
function suggestIconForSegment(segmentName: string): string {
  const name = segmentName.toLowerCase();

  // Map common segment types to Feather icon names
  const iconMap: Record<string, string> = {
    products: "box",
    product: "box",
    services: "briefcase",
    service: "briefcase",
    features: "zap",
    feature: "zap",
    solutions: "target",
    solution: "target",
    industries: "home",
    industry: "home",
    integrations: "link",
    integration: "link",
    pricing: "tag",
    price: "tag",
    team: "users",
    about: "info",
    contact: "mail",
    faq: "help-circle",
    platform: "layers",
    technology: "cpu",
    "case studies": "file-text",
    "case-studies": "file-text",
    portfolio: "grid",
    clients: "users",
    partners: "heart",
    resources: "folder",
    blog: "edit-3",
    news: "rss",
    demo: "play-circle",
    trial: "gift",
    signup: "user-plus",
    analytics: "bar-chart-2",
    security: "shield",
    support: "headphones",
    documentation: "book-open",
    api: "code",
    downloads: "download",
    careers: "award",
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) return icon;
  }

  return "grid"; // Default Feather icon
}

/**
 * Format segments for the prompt with both full and abbreviated names
 * - Full Name: For card titles, section headers, breadcrumbs (NO abbreviation)
 * - Nav Text: For navbar links and footer quick links (max 15 chars, abbreviated)
 */
function formatSegmentsForPrompt(segments: DiscoveredSegment[]): string {
  return segments
    .sort((a, b) => a.priority - b.priority)
    .map((seg, idx) => {
      const icon = getIconForSegment(seg.name);
      const navDisplayName = abbreviateNavText(seg.name, 15); // For navbar only (max 15 chars)
      const fullName = seg.name; // For cards, headers, and other displays
      return `   ${idx + 1}. Full Name: "${fullName}" | Nav Text: "${navDisplayName}" | Slug: data-segment="${seg.slug}" | Icon: <i data-feather="${icon}" class="w-6 h-6 text-white"></i>
      - Description: ${seg.description || "Explore our " + seg.name.toLowerCase()}
      - Items: ${seg.items.length}
      - IMPORTANT: Use "Full Name" for card titles and section headers. Use "Nav Text" for navbar links ONLY.`;
    })
    .join("\n");
}

/**
 * Format CTAs for the prompt
 */
function formatCTAsForPrompt(primaryCTA: CTA, secondaryCTAs: CTA[]): string {
  let ctaText = `PRIMARY CTA: "${primaryCTA.text}" (action: ${primaryCTA.action})`;

  if (secondaryCTAs.length > 0) {
    ctaText += `\nSECONDARY CTAs:`;
    secondaryCTAs.forEach((cta, idx) => {
      ctaText += `\n   ${idx + 1}. "${cta.text}" (action: ${cta.action})`;
    });
  }

  return ctaText;
}

export function generateLandingPagePrompt(requirements: LandingPageRequirements): string {
  let prompt = `Create a MINIMAL, FOCUSED landing page that makes visitors want to explore more.\n\n`;

  // Add website description from settings - this is the USER'S VISION
  if (requirements.websiteDescription && requirements.websiteDescription.trim()) {
    prompt += `========================================
USER'S WEBSITE VISION & REQUIREMENTS
========================================
${requirements.websiteDescription}
========================================

IMPORTANT: The above description represents what the user wants for their website.
Incorporate these requirements into the design, messaging, and overall feel of the landing page.

`;
  }

  // Add business content
  if (requirements.documentContent) {
    prompt += `BUSINESS CONTENT (extract real company name, tagline, and key benefits):\n`;
    prompt += `${requirements.documentContent.substring(0, 8000)}\n\n`;

    prompt += `HERO SECTION CONTENT EXTRACTION:
Look in the above document content for:
1. HEADLINE: Main value proposition, tagline, or company slogan
2. SUBTITLE: What the company does, who they serve
3. KEY BENEFITS: 3-4 bullet points or differentiators mentioned
4. CTA TEXT: What action they want visitors to take

If these aren't explicitly stated, derive them from the overall document context.
DO NOT use placeholder text - extract or intelligently derive from actual content.\n\n`;
  }

  if (requirements.companyName) {
    prompt += `COMPANY NAME: ${requirements.companyName}\n`;
  }

  if (requirements.websiteType) {
    prompt += `WEBSITE TYPE: ${requirements.websiteType}\n`;
  }

  if (requirements.targetAudience) {
    prompt += `TARGET AUDIENCE: ${requirements.targetAudience}\n`;
  }

  if (requirements.mainGoal) {
    prompt += `MAIN GOAL: ${requirements.mainGoal}\n`;
  }

  // Logo placement - CRITICAL: Handle missing logo gracefully
  if (requirements.logoUrl) {
    prompt += `\nLOGO:\n`;
    prompt += `- URL: ${requirements.logoUrl}\n`;
    prompt += `- Use: <img src="${requirements.logoUrl}" alt="${requirements.companyName || "Logo"}" class="h-8 md:h-10 w-auto">\n`;
    prompt += `- Place in navbar on the left\n`;
  } else {
    // No logo provided - use company name as text-based logo
    prompt += `\nLOGO (NO IMAGE PROVIDED - USE TEXT LOGO):\n`;
    prompt += `- IMPORTANT: No logo image was uploaded. DO NOT use any placeholder images or broken image icons.\n`;
    prompt += `- Instead, use the company name "${requirements.companyName || "Company"}" as a stylish TEXT-BASED LOGO.\n`;
    prompt += `- Example text logo: <a data-action="back-to-landing" class="flex-shrink-0 cursor-pointer text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${requirements.companyName || "Company"}</a>\n`;
    prompt += `- Make it visually appealing with gradient text, bold font, or brand colors.\n`;
    prompt += `- NEVER use placeholder images, generic icons, or [LOGO] text.\n`;
  }

  // Brand colors
  if (requirements.brandColors) {
    prompt += requirements.brandColors;
  }

  // Check if Contact/About pages are enabled (used throughout prompt generation)
  const includeAbout = requirements.pageSettings?.includeAboutPage === true;
  const includeContact = requirements.pageSettings?.includeContactPage === true;

  // AI-DISCOVERED CONTENT STRUCTURE
  if (requirements.contentStructure && requirements.contentStructure.segments.length > 0) {
    const structure = requirements.contentStructure;

    prompt += `\n========================================
AI-DISCOVERED CONTENT STRUCTURE
========================================
Business Type: ${structure.businessType}
Analysis Confidence: ${Math.round(structure.analysisConfidence * 100)}%

DISCOVERED SEGMENTS (use these EXACT names and slugs):
${formatSegmentsForPrompt(structure.segments)}

${formatCTAsForPrompt(structure.primaryCTA, structure.secondaryCTAs)}

Lead Capture Points: ${structure.leadCapturePoints.join(", ") || "None specified"}
========================================\n\n`;

    // Build navbar links - ONLY About/Contact, NO business segments
    let navbarLinks = "";
    const navItems = [];
    if (includeAbout) navItems.push('"About" link (data-segment="about")');
    if (includeContact) navItems.push('"Contact" link (data-segment="contact")');

    if (navItems.length > 0) {
      navbarLinks = navItems.join(" + ");
    } else {
      navbarLinks = "no additional links";
    }

    prompt += `CRITICAL REQUIREMENTS (Using AI-Discovered Structure):

⚠️ NAVBAR STRUCTURE (SIMPLIFIED) ⚠️
1. NAVBAR: Logo (left) + ${navbarLinks} + "${structure.primaryCTA.text}" button (right)
   - DO NOT ADD BUSINESS SEGMENT LINKS TO NAVBAR
   - Business segments are navigated via clickable cards below, NOT navbar links
   - Only About/Contact appear in navbar (if enabled)
2. HERO: Dark gradient background, white text, compelling headline
3. Hero CTAs: "${structure.primaryCTA.text}"`;

    // Add first 2 secondary CTAs to hero if they exist
    if (structure.secondaryCTAs.length > 0) {
      prompt += `, "${structure.secondaryCTAs[0].text}"`;
    }
    if (structure.secondaryCTAs.length > 1) {
      prompt += `, "${structure.secondaryCTAs[1].text}"`;
    }

    prompt += `
4. BUSINESS SEGMENT CARDS (Main Content - Cards ONLY, NOT navbar):
   ⚠️ CRITICAL: Create cards for BUSINESS SEGMENTS ONLY (from documents)
   - DO NOT create cards for "About" or "Contact"
   - About and Contact appear in navbar and separate sections below

   Create a card for EACH of these business segments:
${structure.segments.map((seg, idx) => `   ${idx + 1}. "${seg.name}" (data-segment="${seg.slug}")`).join("\n")}

   Each card must have:
   - Card title: Use "Full Name" - NEVER use abbreviated "Nav Text"!
   - data-segment="[segment-slug]" attribute
   - cursor-pointer class
   - hover:shadow-lg hover:scale-105 transition
5. ABOUT SECTION (${includeAbout ? "REQUIRED" : "SKIP"}):${
      includeAbout
        ? `
   - Full-width section BELOW segment cards
   - Background: bg-white or bg-gray-50
   - Padding: py-12 sm:py-16 lg:py-24 px-4
   - Container: max-w-4xl mx-auto
   - Title: "About Us" (text-3xl font-bold)
   - Display company information from brand assets
   - Button: "Learn More" with data-segment="about"`
        : `
   - ⚠️ SKIP this section - user disabled About page`
    }
6. CONTACT SECTION (${includeContact ? "REQUIRED" : "SKIP"}):${
      includeContact
        ? `
   - Full-width section BELOW About section
   - Background: bg-gray-50
   - Padding: py-12 sm:py-16 lg:py-24 px-4
   - Container: max-w-5xl mx-auto
   - Title: "Get In Touch" (text-3xl font-bold text-center)
   - Display contact info in 3-column grid:${requirements.contactInfo?.email ? `\n     * Email: ${requirements.contactInfo.email}` : ""}${requirements.contactInfo?.phone ? `\n     * Phone: ${requirements.contactInfo.phone}` : ""}${requirements.contactInfo?.address ? `\n     * Address: ${requirements.contactInfo.address}` : ""}
   - Button: "Contact Us" with data-segment="contact"`
        : `
   - ⚠️ SKIP this section - user disabled Contact page`
    }
7. CTA SECTION: "${structure.primaryCTA.text}" as primary button
8. FOOTER: ${structure.segments.length > 0 ? `Quick Links section with business segments${includeAbout || includeContact ? ` + ${[includeAbout && "About", includeContact && "Contact"].filter(Boolean).join(" + ")}` : ""}` : includeAbout || includeContact ? `Quick Links section with ONLY ${[includeAbout && "About", includeContact && "Contact"].filter(Boolean).join(" + ")} (NO business segments)` : "DO NOT include Quick Links section - show only logo, copyright, and social media icons"}

DATA-SEGMENT ATTRIBUTES (copy these exactly):

BUSINESS SEGMENTS (for cards only):`;

    structure.segments.forEach((seg) => {
      prompt += `\n- ${seg.name} card: data-segment="${seg.slug}"`;
    });

    prompt += `\n\nSUPPLEMENTARY PAGES (for navbar links and section buttons, NOT cards):`;
    if (includeAbout) {
      prompt += `\n- About link: data-segment="about"`;
    }
    if (includeContact) {
      prompt += `\n- Contact link: data-segment="contact"`;
    }
  } else {
    // Fallback when no content structure available
    prompt += `\n========================================
NO BUSINESS CONTENT DISCOVERED
========================================
No business segments were discovered from uploaded documents.

Create a minimal landing page with:
- Hero section with company description
- Call-to-action buttons
- About section (if enabled)
- Contact section (if enabled)
- Footer

DO NOT CREATE SEGMENT CARDS - no business content available.
========================================\n\n`;

    prompt += `REQUIREMENTS:
1. NAVBAR: Logo${includeAbout ? ' + About link (data-segment="about")' : ""}${includeContact ? ' + Contact link (data-segment="contact")' : ""} + "Get Started" CTA button
   - DO NOT add placeholder cards or fake business segments
2. HERO: Compelling headline based on company description, dark gradient background
3. CTA: Primary call-to-action button${
      includeAbout
        ? `
4. ABOUT SECTION: Display company information with "Learn More" button (data-segment="about")`
        : ""
    }${
      includeContact
        ? `
5. CONTACT SECTION: Display contact information with "Contact Us" button (data-segment="contact")`
        : ""
    }
6. FOOTER: Simple footer with social links (no segment links)`;
  }

  // Add social media links if provided
  if (requirements.socialMedia) {
    const socialLinks = Object.entries(requirements.socialMedia)
      .filter(([, url]) => url && url.trim().length > 0)
      .map(([platform, url]) => `   - ${platform}: ${url}`)
      .join("\n");

    if (socialLinks) {
      prompt += `\n\n========================================
SOCIAL MEDIA LINKS (Include in Footer)
========================================
${socialLinks}

FOOTER SOCIAL ICONS (Required):
For each social media link above, add a clickable icon in the footer:
- LinkedIn: <a href="[url]" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition"><i data-feather="linkedin" class="w-5 h-5"></i></a>
- Twitter/X: <a href="[url]" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition"><i data-feather="twitter" class="w-5 h-5"></i></a>
- Facebook: <a href="[url]" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition"><i data-feather="facebook" class="w-5 h-5"></i></a>
- Instagram: <a href="[url]" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition"><i data-feather="instagram" class="w-5 h-5"></i></a>
- YouTube: <a href="[url]" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition"><i data-feather="youtube" class="w-5 h-5"></i></a>

Place social icons in a row in the footer: <div class="flex gap-4">...</div>
========================================`;
    }
  }

  // Add Contact and About page links conditionally based on pageSettings (already defined above)
  if (includeContact || includeAbout) {
    prompt += `\n\n========================================
ADDITIONAL NAVBAR & FOOTER LINKS (User-Enabled)
========================================`;

    if (includeAbout) {
      prompt += `
ABOUT US PAGE ENABLED:
- Add "About" link to navbar: <a href="#" data-segment="about" class="hover:underline">About</a>
- Add "About" link to footer Quick Links section
- User provided company info:`;
      if (requirements.aboutInfo?.companyHistory) {
        prompt += `\n  - Company History: Available`;
      }
      if (requirements.aboutInfo?.missionStatement) {
        prompt += `\n  - Mission Statement: Available`;
      }
      if (requirements.aboutInfo?.visionStatement) {
        prompt += `\n  - Vision Statement: Available`;
      }
      if (requirements.aboutInfo?.companyValues) {
        prompt += `\n  - Company Values: Available`;
      }
    }

    if (includeContact) {
      prompt += `
CONTACT US PAGE ENABLED:
- Add "Contact" link to navbar: <a href="#" data-segment="contact" class="hover:underline">Contact</a>
- Add "Contact" link to footer Quick Links section
- User provided contact info:`;
      if (requirements.contactInfo?.email) {
        prompt += `\n  - Email: ${requirements.contactInfo.email}`;
      }
      if (requirements.contactInfo?.phone) {
        prompt += `\n  - Phone: ${requirements.contactInfo.phone}`;
      }
      if (requirements.contactInfo?.address) {
        prompt += `\n  - Address: ${requirements.contactInfo.address}`;
      }
    }

    prompt += `
========================================
IMPORTANT: Add these links ONLY because the user explicitly enabled them during onboarding.
Place "About" and "Contact" links AFTER the discovered segment links in both navbar and footer.
========================================`;
  } else {
    prompt += `\n\n========================================
NO CONTACT/ABOUT PAGES
========================================
The user has NOT enabled Contact or About pages during onboarding.
DO NOT add "Contact Us" or "About Us" links to the navbar or footer.
Only include links for the AI-discovered segments listed above.
========================================`;
  }

  prompt += `\n\nGenerate the complete HTML now.`;

  return prompt;
}

/**
 * Legacy function for backward compatibility
 * Maps old hardcoded segments to new dynamic format
 */
export function generateLandingPagePromptLegacy(
  requirements: Omit<LandingPageRequirements, "contentStructure">
): string {
  // Create a mock content structure with old hardcoded segments
  const legacyStructure: ContentStructure = {
    id: "legacy",
    siteId: "",
    segments: [
      {
        id: "features",
        name: "Features",
        slug: "features",
        description: "Explore our features",
        items: [],
        suggestedInteractions: ["view-details"],
        priority: 1,
      },
      {
        id: "solutions",
        name: "Solutions",
        slug: "solutions",
        description: "See our solutions",
        items: [],
        suggestedInteractions: ["view-details"],
        priority: 2,
      },
      {
        id: "platform",
        name: "Platform",
        slug: "platform",
        description: "Learn about our platform",
        items: [],
        suggestedInteractions: ["view-details"],
        priority: 3,
      },
      {
        id: "faq",
        name: "FAQ",
        slug: "faq",
        description: "Frequently asked questions",
        items: [],
        suggestedInteractions: ["view-details"],
        priority: 4,
      },
    ],
    maxDepth: 2,
    leadCapturePoints: ["demo", "contact"],
    primaryCTA: { text: "Request Demo", action: "demo", style: "primary" },
    secondaryCTAs: [{ text: "Get Started", action: "signup", style: "secondary" }],
    businessType: "product",
    analysisVersion: 0,
    lastAnalyzedAt: new Date(),
    documentHash: "",
    analysisConfidence: 0.5,
  };

  return generateLandingPagePrompt({
    ...requirements,
    contentStructure: legacyStructure,
  });
}
