/**
 * UI/UX Design Guidelines for Website Generation
 *
 * These guidelines ensure consistent, professional, and accessible
 * website designs across all generated pages.
 */

export const UI_GUIDELINES = `
================================================================================
MANDATORY UI/UX DESIGN GUIDELINES
================================================================================

These rules are NON-NEGOTIABLE and MUST be followed for every generated page.

--------------------------------------------------------------------------------
1. NAVIGATION BAR RULES
--------------------------------------------------------------------------------

TEXT LENGTH LIMITS:
- Nav link text: MAXIMUM 20 characters
- If segment name exceeds 20 chars, ABBREVIATE intelligently:
  - "Intelligent Enterprise Solutions" → "Enterprise Solutions"
  - "Industries & Use Cases" → "Industries"
  - "Customer Success Stories" → "Success Stories"
  - "Frequently Asked Questions" → "FAQ"
- CTA button text: MAXIMUM 18 characters
  - "Start Your Orchestration Journey" → "Get Started"
  - "Schedule a Consultation" → "Book Demo"

NAVBAR STRUCTURE:
- Logo MUST be clickable with data-action="back-to-landing"
- Logo + company name combined should not exceed 200px width
- Maximum 5 nav items (excluding CTA button)
- If more than 5 segments, use "More" dropdown or prioritize top 4

NAVBAR STYLING:
- Height: h-16 (64px) standard
- Background: bg-white/95 backdrop-blur-md (light) or bg-gray-900/95 (dark)
- Shadow: shadow-sm for subtle depth
- Position: fixed top-0 left-0 right-0 z-50
- Mobile: hamburger menu for screens < 768px

--------------------------------------------------------------------------------
2. ICON GUIDELINES (CRITICAL)
--------------------------------------------------------------------------------

ICON LIBRARY - USE FEATHER ICONS ONLY:
- CDN: <script src="https://unpkg.com/feather-icons"></script>
- Syntax: <i data-feather="icon-name" class="..."></i>
- ALWAYS call feather.replace() at end of body

ICON SIZING (STRICTLY ENFORCED):
- Inline with text (feature lists): w-5 h-5 (20px)
- Card icons: w-6 h-6 (24px)
- Hero/section icons: w-8 h-8 to w-12 h-12 (32-48px)
- NEVER smaller than w-4 h-4 (16px)

ICON VISIBILITY:
- Icons MUST have sufficient contrast against background
- On dark backgrounds: text-white or text-gray-200
- On light backgrounds: text-gray-700 or brand color
- NEVER use text-gray-400 or lighter for icons

ICON CONTAINERS (for emphasis):
- Use background circles/rounded squares:
  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
    <i data-feather="icon-name" class="w-6 h-6 text-white"></i>
  </div>

ICON SELECTION BY CONTEXT:
- Features/capabilities: zap, star, shield, check-circle, award
- Products: box, package, shopping-bag
- Services: briefcase, tool, settings
- Analytics: bar-chart-2, trending-up, pie-chart
- Users/team: users, user-plus, user-check
- Communication: mail, message-circle, phone
- Security: shield, lock, key
- Time: clock, calendar, watch
- Navigation: arrow-right, chevron-right, external-link
- Social: facebook, twitter, linkedin, instagram, youtube, github

NEVER USE:
- Emoji as icons (inconsistent rendering)
- Unicode symbols
- Placeholder icons (?, !)
- Custom SVG paths without proper rendering

--------------------------------------------------------------------------------
3. TYPOGRAPHY RULES
--------------------------------------------------------------------------------

FONT HIERARCHY:
- H1 (hero): text-4xl md:text-5xl lg:text-6xl font-bold
- H2 (sections): text-3xl md:text-4xl font-bold
- H3 (cards): text-xl font-semibold
- Body: text-base (16px) font-normal
- Small: text-sm (14px)
- Caption: text-xs (12px)

LINE LENGTH:
- Body text: max-w-prose (65ch) or max-w-2xl
- Headlines: max-w-4xl
- Never let text span full width on large screens

CONTRAST REQUIREMENTS:
- Body text on white: text-gray-700 minimum
- Body text on dark: text-gray-200 minimum
- Headlines: can be darker (text-gray-900 or text-white)
- Links: must be distinguishable (underline or brand color)

--------------------------------------------------------------------------------
4. SPACING & LAYOUT
--------------------------------------------------------------------------------

SECTION PADDING:
- Standard sections: py-16 md:py-24 px-4 md:px-8
- Hero sections: py-20 md:py-32
- Tight sections: py-12

CARD SPACING:
- Card padding: p-6 md:p-8
- Card gap in grid: gap-6 md:gap-8
- Card border-radius: rounded-xl or rounded-2xl

CONTAINER:
- Max width: max-w-7xl mx-auto
- Padding: px-4 sm:px-6 lg:px-8

GRID LAYOUTS:
- 2 columns: grid-cols-1 md:grid-cols-2
- 3 columns: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- 4 columns: grid-cols-2 md:grid-cols-3 lg:grid-cols-4

--------------------------------------------------------------------------------
5. BUTTON STYLING
--------------------------------------------------------------------------------

PRIMARY CTA:
- Background: brand color (not too bright)
- Text: white, font-semibold
- Padding: px-6 py-3 md:px-8 py-4
- Border radius: rounded-full or rounded-lg
- Shadow: shadow-lg shadow-brand/20
- Hover: hover:scale-105 transition-transform

SECONDARY CTA:
- Background: transparent or bg-white/10
- Border: border border-gray-300 or border-white/20
- Text: text-gray-900 or text-white
- Same padding and radius as primary

BUTTON TEXT:
- Use action verbs: "Get Started", "Learn More", "Book Demo"
- Maximum 3 words
- No punctuation

DATA ATTRIBUTES (REQUIRED):
- data-action="cta-primary" or "cta-secondary" or "cta-footer"
- data-cta-type="demo|signup|contact|trial|learn-more"

--------------------------------------------------------------------------------
6. COLOR USAGE
--------------------------------------------------------------------------------

BRAND COLOR APPLICATION:
- Primary CTA buttons
- Active nav link indicator
- Icon containers
- Accent borders
- Links (optional)

NEVER:
- Use brand color for large background areas (overwhelming)
- Use pure black (#000) - use gray-900 instead
- Use pure white (#fff) for text on colored backgrounds - use gray-50

GRADIENTS:
- Hero backgrounds: from-slate-900 via-gray-900 to-slate-800
- Icon containers: from-brand-500 to-brand-600
- CTA backgrounds: from-brand-600 to-brand-700

--------------------------------------------------------------------------------
7. RESPONSIVE DESIGN (CRITICAL - MOBILE-FIRST)
--------------------------------------------------------------------------------

TAILWIND BREAKPOINTS:
- sm: 640px (small tablets, large phones landscape)
- md: 768px (tablets)
- lg: 1024px (small laptops, tablets landscape)
- xl: 1280px (desktops)
- 2xl: 1536px (large desktops)

MOBILE-FIRST APPROACH (MANDATORY):
Write base styles for mobile first, then add breakpoint modifiers:
- BAD: text-xl sm:text-lg (starts desktop, shrinks for mobile)
- GOOD: text-lg sm:text-xl (starts mobile, grows for desktop)

================================================================================
MOBILE DESIGN (< 640px) - BASE STYLES
================================================================================

MOBILE NAVIGATION (REQUIRED):
- Hide desktop nav links: class="hidden md:flex"
- Show hamburger button: class="md:hidden"
- Full-screen mobile menu overlay when open
- Example hamburger button:
  <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg hover:bg-gray-100" aria-label="Menu">
    <i data-feather="menu" class="w-6 h-6"></i>
  </button>
- Example mobile menu:
  <div id="mobile-menu" class="fixed inset-0 bg-white z-50 transform translate-x-full transition-transform md:hidden">
    <div class="flex justify-between items-center p-4 border-b">
      <span class="font-semibold">Menu</span>
      <button id="mobile-menu-close" class="p-2"><i data-feather="x" class="w-6 h-6"></i></button>
    </div>
    <nav class="p-4 space-y-4">
      <!-- Nav links with data-segment attributes, full width, py-3 for touch -->
    </nav>
  </div>

MOBILE TYPOGRAPHY:
- H1 hero: text-3xl (30px base, scales up)
- H2 sections: text-2xl (24px base)
- H3 cards: text-lg (18px base)
- Body: text-base (16px - never smaller on mobile)
- Line height: leading-relaxed for readability

MOBILE LAYOUTS:
- Single column: grid-cols-1 (always)
- Full width containers: w-full px-4
- Stack everything vertically
- Section padding: py-12 px-4

MOBILE BUTTONS & TOUCH TARGETS:
- Minimum touch target: 44px x 44px
- Full-width CTAs: w-full py-4
- Adequate spacing between buttons: gap-4 or space-y-4
- Example: <button class="w-full py-4 px-6 text-base font-semibold rounded-xl">

MOBILE CARDS:
- Full width: w-full
- Larger padding: p-6
- Stack vertically with gap: space-y-4 or gap-4
- Touch-friendly spacing

MOBILE IMAGES:
- Full width: w-full
- Maintain aspect ratio: aspect-video or aspect-square
- Lazy loading: loading="lazy"

================================================================================
TABLET DESIGN (640px - 1024px) - sm: and md: prefixes
================================================================================

TABLET NAVIGATION:
- Can show condensed nav: sm:flex with fewer items
- Or keep hamburger until md: breakpoint
- Recommended: hamburger until md:768px

TABLET LAYOUTS:
- 2-column grids: grid-cols-1 sm:grid-cols-2
- Side-by-side hero layout option
- Section padding: sm:py-16 sm:px-6

TABLET TYPOGRAPHY:
- H1 hero: sm:text-4xl md:text-5xl
- H2 sections: sm:text-3xl
- Maintain readability

TABLET CARDS:
- 2 per row: grid-cols-1 sm:grid-cols-2
- Equal heights: items-stretch
- Padding: sm:p-6

================================================================================
DESKTOP DESIGN (1024px+) - lg: and xl: prefixes
================================================================================

DESKTOP NAVIGATION:
- Full horizontal nav: lg:flex
- All nav items visible
- Sticky header with backdrop blur

DESKTOP LAYOUTS:
- 3-4 column grids: lg:grid-cols-3 xl:grid-cols-4
- Max container width: max-w-7xl mx-auto
- Generous padding: lg:py-24 lg:px-8

DESKTOP TYPOGRAPHY:
- H1 hero: lg:text-6xl xl:text-7xl
- H2 sections: lg:text-4xl
- Line length limits: max-w-prose for body text

================================================================================
RESPONSIVE PATTERNS (COPY THESE)
================================================================================

RESPONSIVE GRID (3 columns):
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

RESPONSIVE SECTION:
<section class="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">

RESPONSIVE HERO:
<section class="min-h-screen flex items-center py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto text-center">
    <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">

RESPONSIVE CARD:
<div class="bg-white rounded-xl p-5 sm:p-6 lg:p-8 shadow-lg">

RESPONSIVE BUTTON GROUP:
<div class="flex flex-col sm:flex-row gap-4 sm:justify-center">
  <button class="w-full sm:w-auto px-6 py-4 sm:py-3">

RESPONSIVE TEXT:
<p class="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">

RESPONSIVE FOOTER:
<footer class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">

================================================================================
MOBILE MENU JAVASCRIPT (REQUIRED)
================================================================================

Include this JavaScript for mobile menu toggle:
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuClose = document.getElementById('mobile-menu-close');

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('translate-x-full');
  });
  mobileMenuClose?.addEventListener('click', () => {
    mobileMenu.classList.add('translate-x-full');
  });
  // Close on nav link click
  mobileMenu.querySelectorAll('a, button[data-segment]').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('translate-x-full');
    });
  });
}

--------------------------------------------------------------------------------
8. ACCESSIBILITY
--------------------------------------------------------------------------------

REQUIREMENTS:
- Contrast ratio: 4.5:1 minimum for text
- Focus states: visible focus rings on all interactive elements
- Alt text: describe images meaningfully
- Semantic HTML: use proper heading hierarchy
- Skip links: include "Skip to content" link
- ARIA labels: for icon-only buttons

--------------------------------------------------------------------------------
9. NAVIGATION FLOW (HOME BUTTON FIX)
--------------------------------------------------------------------------------

BACK TO HOME BEHAVIOR:
- Logo click: data-action="back-to-landing"
- "Home" nav link: data-segment="home" OR data-action="back-to-landing"
- Breadcrumb "Home": data-action="back-to-landing"
- ALL home navigation must go to the SAME landing page of CURRENT site

SEGMENT NAVIGATION:
- Use data-segment="[exact-slug]" attribute
- Slugs must match exactly what was discovered
- Case sensitive - use lowercase with hyphens

--------------------------------------------------------------------------------
10. CONTENT RULES
--------------------------------------------------------------------------------

NO PLACEHOLDERS:
- Never use "Lorem ipsum"
- Never use "[Company Name]" - use actual name
- Never use generic text if real content available
- Never use "?" or broken icon placeholders

CONTENT EXTRACTION:
- Extract real headlines from documents
- Use actual product/service names
- Include real statistics if available
- Match the business's tone and terminology

================================================================================
END OF GUIDELINES
================================================================================
`;

/**
 * Short version for inline prompts (reduces token usage)
 */
export const UI_GUIDELINES_SHORT = `
MANDATORY UI RULES:
1. NAV: Max 20 chars per link, hamburger menu on mobile (md:hidden), desktop nav hidden sm
2. ICONS: Use Feather icons only, min w-5 h-5, high contrast, no emojis
3. BUTTONS: data-action + data-cta-type required, full-width on mobile (w-full sm:w-auto)
4. HOME NAV: Logo must have data-action="back-to-landing"
5. NO PLACEHOLDERS: Real content only, no "?", no Lorem ipsum
6. RESPONSIVE (CRITICAL):
   - Mobile-first: base styles for mobile, add sm:/md:/lg: for larger
   - Typography: text-3xl sm:text-4xl md:text-5xl lg:text-6xl for headings
   - Grids: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
   - Buttons: flex-col sm:flex-row, w-full sm:w-auto
   - Touch targets: min py-4 px-6 on mobile, 44px minimum
   - Section padding: py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8
`;

/**
 * Icon mapping for common segment types
 */
export const SEGMENT_ICON_MAP: Record<string, string> = {
  // Products & Services
  products: "box",
  product: "box",
  services: "briefcase",
  service: "briefcase",
  offerings: "gift",

  // Features & Capabilities
  features: "zap",
  feature: "zap",
  capabilities: "cpu",
  capability: "cpu",

  // Solutions
  solutions: "target",
  solution: "target",

  // Industries
  industries: "globe",
  industry: "globe",
  sectors: "layers",

  // Use Cases
  "use-cases": "clipboard",
  "use cases": "clipboard",
  usecases: "clipboard",

  // About & Company
  about: "info",
  "about-us": "info",
  company: "home",
  team: "users",

  // Support & Help
  faq: "help-circle",
  faqs: "help-circle",
  support: "headphones",
  help: "life-buoy",

  // Contact & Communication
  contact: "mail",
  "contact-us": "mail",

  // Pricing
  pricing: "tag",
  plans: "credit-card",

  // Resources
  resources: "folder",
  docs: "book-open",
  documentation: "book-open",
  blog: "edit-3",
  news: "rss",

  // Success & Case Studies
  "case-studies": "file-text",
  "success-stories": "award",
  testimonials: "message-circle",
  customers: "users",

  // Platform & Technology
  platform: "layers",
  technology: "cpu",
  integrations: "link",
  api: "code",

  // Analytics & Insights
  analytics: "bar-chart-2",
  insights: "trending-up",
  reports: "pie-chart",

  // Security
  security: "shield",
  compliance: "check-square",

  // Default
  default: "grid",
};

/**
 * Get appropriate Feather icon for a segment name
 */
export function getIconForSegment(segmentName: string): string {
  const normalized = segmentName.toLowerCase().replace(/\s+/g, "-");

  // Direct match
  if (SEGMENT_ICON_MAP[normalized]) {
    return SEGMENT_ICON_MAP[normalized];
  }

  // Partial match
  for (const [key, icon] of Object.entries(SEGMENT_ICON_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return icon;
    }
  }

  return SEGMENT_ICON_MAP.default;
}

/**
 * Abbreviate long nav text to fit within limits
 */
export function abbreviateNavText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;

  // Common abbreviations
  const abbreviations: Record<string, string> = {
    "intelligent enterprise solutions": "Enterprise Solutions",
    "industries & use cases": "Industries",
    "industries and use cases": "Industries",
    "customer success stories": "Success Stories",
    "success stories": "Success",
    "frequently asked questions": "FAQ",
    "case studies": "Case Studies",
    "about us": "About",
    "contact us": "Contact",
    "get started": "Start",
    "learn more": "Learn More",
    "schedule a demo": "Book Demo",
    "request a demo": "Get Demo",
    "start your journey": "Get Started",
    "start your orchestration journey": "Get Started",
  };

  const lower = text.toLowerCase();
  if (abbreviations[lower]) {
    return abbreviations[lower];
  }

  // Try removing common words
  const shortened = text
    .replace(/\b(the|a|an|and|&|of|for|with|your|our)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (shortened.length <= maxLength) return shortened;

  // Take first N characters and add ellipsis
  return text.substring(0, maxLength - 1) + "…";
}
