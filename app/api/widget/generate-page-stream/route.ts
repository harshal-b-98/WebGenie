/**
 * API Route: Stream Dynamic Page Generation
 *
 * POST /api/widget/generate-page-stream
 *
 * Uses Server-Sent Events (SSE) to stream page sections progressively.
 * Client shows skeleton UI and reveals sections as they're generated.
 */

import { NextRequest } from "next/server";
import { streamText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { detectPersona, type PersonaSignals, getPersonaEmphasis } from "@/lib/ai/prompts/personas";
import { extractColorsFromImage, generateColorPrompt } from "@/lib/utils/color-extractor";
import { detectSegmentType } from "@/lib/ai/prompts/dynamic-segment";

// CORS headers for widget requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

interface StreamPageRequest {
  siteId: string;
  versionId?: string;
  pageType: "segment" | "detail";
  segment: string;
  topic?: string; // For detail pages
  itemSlug?: string; // Legacy support
  sessionId?: string;
  behaviorSignals?: PersonaSignals;
  context?: {
    currentPage?: string;
    clickedTopic?: string;
    parentSegment?: string;
  };
}

/**
 * Validate a generated section for completeness - LENIENT validation
 * Only checks for truly broken sections, not strict requirements
 */
interface SectionValidationResult {
  isValid: boolean;
  warnings: string[];
}

function validateSectionHtml(sectionId: string, html: string): SectionValidationResult {
  const warnings: string[] = [];

  // Only reject if truly empty
  if (!html || html.trim().length < 100) {
    return { isValid: false, warnings: [`Section "${sectionId}" is empty or too short`] };
  }

  // Log warnings but don't fail
  const minLengths: Record<string, number> = {
    header: 400,
    content: 400,
    footer: 300,
  };

  const minLength = minLengths[sectionId] || 200;
  if (html.length < minLength) {
    warnings.push(`Section "${sectionId}" shorter than expected (${html.length} chars)`);
  }

  return {
    isValid: true,
    warnings,
  };
}

/**
 * Convert slug to readable name
 */
function formatSlugToName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Context for section generation
 */
interface SectionContext {
  companyName: string;
  segmentName: string;
  segmentSlug: string;
  segmentDescription: string;
  items: Array<{ name: string; slug: string; description: string; hasDetailPage: boolean }>;
  brandColors: string;
  logoUrl: string | null;
  allSegments: Array<{ name: string; slug: string }>;
  primaryCTA: { text: string; action: string };
  personaEmphasis: string;
  documentContent: string;
  // For detail pages
  pageType: "segment" | "detail";
  topicName?: string;
  topicSlug?: string;
  parentSegment?: string;
  navigationContext?: {
    currentPage?: string;
    clickedTopic?: string;
  };
}

/**
 * Generate section-specific prompts for streaming
 * OPTIMIZED: 3 sections instead of 5 for faster generation and less tokens
 */
function generateSectionPrompt(
  section: string,
  context: SectionContext
): { system: string; prompt: string } {
  const baseSystem = `Generate HTML using Tailwind CSS. Output raw HTML only - no markdown.

╔═══════════════════════════════════════════════════════════╗
║  🚨 DATA ATTRIBUTES REQUIRED FOR ALL NAVIGATION 🚨     ║
╚═══════════════════════════════════════════════════════════╝

MANDATORY RULES:
1. NAV LINKS: data-segment="slug" REQUIRED
2. BUTTONS: data-action="cta-primary" data-cta-type="demo" REQUIRED
3. LOGO: data-action="back-to-landing" REQUIRED
4. CARDS: data-topic="slug" data-parent-segment="parent" REQUIRED

✅ CORRECT:
  <a href="#" data-segment="features">Features</a>
  <button data-action="cta-primary" data-cta-type="demo">Demo</button>
  <div data-topic="topic" data-parent-segment="parent" class="cursor-pointer">Card</div>

❌ WRONG:
  <a href="#">Link</a>  ← NO DATA ATTRIBUTE!
  <button>Click</button>  ← NO data-action!

Use Feather icons: <i data-feather="icon" class="w-5 h-5"></i>
Include: <script src="https://unpkg.com/feather-icons"></script>
Call: feather.replace() at end`;

  // Abbreviate long nav names
  const abbreviate = (name: string) => {
    if (name.length <= 20) return name;
    const abbrevs: Record<string, string> = {
      "intelligent enterprise solutions": "Enterprise",
      "industries & use cases": "Industries",
      "customer success stories": "Success Stories",
      "frequently asked questions": "FAQ",
    };
    return abbrevs[name.toLowerCase()] || name.substring(0, 17) + "...";
  };

  const navItems = context.allSegments
    .map((s) => `${abbreviate(s.name)} (data-segment="${s.slug}")`)
    .join(", ");

  // Determine page title based on type
  const pageTitle =
    context.pageType === "detail" && context.topicName ? context.topicName : context.segmentName;

  // Build breadcrumb based on page type
  const breadcrumb =
    context.pageType === "detail" && context.parentSegment
      ? `Home > ${formatSlugToName(context.parentSegment)} > ${pageTitle}`
      : `Home > ${pageTitle}`;

  switch (section) {
    // TWO-ROW HEADER: navbar + breadcrumb (fixed) + hero (below)
    case "header":
      return {
        system: baseSystem,
        prompt: `Generate a TWO-ROW HEADER with navbar, breadcrumb, and hero section.

CRITICAL RULES:
- NO placeholder text EVER - use ONLY real content from the provided page description and context
- NO invented facts, data, names, or Lorem ipsum
- PAGE TITLE MUST BE EXACTLY: "${pageTitle}" (DO NOT change or rephrase this title)

Company: ${context.companyName}
Logo: ${context.logoUrl || "Text logo"}
Current Page: ${pageTitle}
Page Type: ${context.pageType === "detail" ? "Detail/Topic Page" : "Segment Page"}
CTA: "${context.primaryCTA.text}"

PAGE DESCRIPTION (USE THIS FOR ALL CONTENT):
${context.segmentDescription}

===== EXACT HTML STRUCTURE (COPY THIS PATTERN) =====

<header data-section="header">
  <!-- FIXED TWO-ROW NAVBAR -->
  <div class="fixed top-0 w-full z-50">
    <!-- Row 1: Primary Navbar -->
    <div class="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-12">
        <a href="#" data-action="back-to-landing" class="flex-shrink-0 font-bold text-xl text-indigo-600">${context.companyName}</a>
        <div class="flex items-center gap-4 ml-auto">
          <a href="#" data-action="cta-primary" data-cta-type="demo" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">${context.primaryCTA.text}</a>
        </div>
      </div>
    </div>

    <!-- Row 2: Breadcrumb Navigation -->
    <div class="bg-white/90 backdrop-blur-sm border-b border-gray-200/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <ol class="flex items-center space-x-2 text-sm">
          <li>
            <a href="#" data-action="back-to-landing" class="text-gray-600 hover:text-indigo-600 transition-colors">Home</a>
          </li>
          <li><span class="text-gray-400 mx-1">›</span></li>
${
  context.pageType === "detail" && context.parentSegment
    ? `          <li>
            <a href="#" data-segment="${context.parentSegment}" class="text-gray-600 hover:text-indigo-600 transition-colors">${formatSlugToName(context.parentSegment)}</a>
          </li>
          <li><span class="text-gray-400 mx-1">›</span></li>
          <li class="text-gray-900 font-medium">${pageTitle}</li>`
    : `          <li class="text-gray-900 font-medium">${pageTitle}</li>`
}
        </ol>
      </div>
    </div>
  </div>

  <!-- SPACER: Push content below fixed navbar (h-12 navbar + h-10 breadcrumb = 88px) -->
  <div class="h-[88px]"></div>

  <!-- HERO SECTION -->
  <section class="min-h-[50vh] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center py-16 px-4">
    <div class="text-center max-w-4xl mx-auto">
      <!-- Icon Badge -->
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 mx-auto">
        <i data-feather="[APPROPRIATE_ICON]" class="w-8 h-8 text-white"></i>
      </div>

      <!-- Title -->
      <h1 class="text-4xl md:text-5xl font-bold text-white tracking-tight">${pageTitle}</h1>

      <!-- Subtitle (extract from page description) -->
      <p class="text-xl text-gray-300 max-w-2xl mx-auto mt-4">[SUBTITLE FROM PAGE DESCRIPTION]</p>

      <!-- Feature Pills (3-4 key features) -->
      <div class="flex flex-wrap gap-3 justify-center mt-8">
        <span class="px-4 py-2 bg-white/10 backdrop-blur rounded-full text-sm text-gray-300 flex items-center gap-2">
          <i data-feather="check-circle" class="w-4 h-4"></i> [Feature 1]
        </span>
        <!-- Add 2-3 more feature pills -->
      </div>

      <!-- CTA Buttons -->
      <div class="flex gap-4 justify-center mt-8">
        <a href="#" data-action="cta-primary" data-cta-type="demo" class="bg-indigo-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-indigo-700 transition-colors shadow-lg">${context.primaryCTA.text}</a>
        <a href="#" data-action="cta-secondary" class="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-full hover:bg-white/20 transition-colors">Learn More</a>
      </div>
    </div>
  </section>

  <script>if(typeof feather !== 'undefined') feather.replace();</script>
</header>

===== END HTML PATTERN =====

IMPORTANT INSTRUCTIONS:
1. Copy the EXACT HTML structure above
2. Replace [APPROPRIATE_ICON] with: bar-chart-2 (analytics), settings (platform), target (solutions), help-circle (FAQ), globe (industries), box (products)
3. Replace [SUBTITLE FROM PAGE DESCRIPTION] with actual content from page description
4. Replace [Feature 1], etc. with real features extracted from page description (3-4 features)
5. The TWO-ROW navbar is FIXED - do NOT change its structure
6. The breadcrumb uses "›" character as separator
7. The spacer div (h-[88px]) is REQUIRED to push content below fixed navbar
8. DO NOT put breadcrumb inside hero section

Output the complete <header data-section="header"> element.`,
      };

    case "content":
      // Different content prompts for segment vs detail pages
      if (context.pageType === "detail") {
        // Detail page: deep dive content about specific topic
        const relatedTopics = context.items
          .filter((item) => item.slug !== context.topicSlug)
          .slice(0, 4)
          .map(
            (item) =>
              `- ${item.name} (data-topic="${item.slug}" data-parent-segment="${context.parentSegment || context.segmentSlug}")`
          )
          .join("\n");

        return {
          system: baseSystem,
          prompt: `Generate DETAILED content section for "${context.topicName || context.topicSlug}".

CRITICAL: This is a DETAIL/DEEP-DIVE page about "${context.topicName || context.topicSlug}".
The user clicked on this specific topic - generate comprehensive, in-depth content about THIS topic.

TOPIC: ${context.topicName || formatSlugToName(context.topicSlug || "")}
Parent Segment: ${context.parentSegment || context.segmentSlug}

PAGE DESCRIPTION:
${context.segmentDescription}

DOCUMENT CONTENT (extract real details):
${context.documentContent.substring(0, 4000)}

${context.personaEmphasis}

STRUCTURE FOR DETAIL PAGE:
1. Overview section: 2-3 paragraphs explaining this topic in depth
2. Key Benefits/Features: 3-5 specific benefits with icons
3. How It Works: Step-by-step or process explanation if applicable
4. Use Cases: 2-3 real-world applications
5. Related Topics section with clickable links:
${relatedTopics || "  - Show links back to parent segment"}

NAVIGATION RULES:
- Related topics use: data-topic="slug" data-parent-segment="${context.parentSegment || context.segmentSlug}"
- Back to segment use: data-segment="${context.parentSegment || context.segmentSlug}"
- If no more related topics, show CTA: data-action="cta-primary" data-cta-type="demo"

Output <section data-section="content">.`,
        };
      }

      // Segment page: grid of clickable cards
      const itemsList = context.items
        .slice(0, 6) // Limit to 6 items max
        .map(
          (item) =>
            `- ${item.name}: ${item.description.substring(0, 150)} (data-topic="${item.slug}" data-parent-segment="${context.segmentSlug}")`
        )
        .join("\n");

      return {
        system: baseSystem,
        prompt: `Generate a COMPLETE, visually impressive content section for "${pageTitle}".

CRITICAL: Generate REAL content with substance - no placeholder or generic text.

PAGE: ${pageTitle}
SEGMENT DESCRIPTION: ${context.segmentDescription}

ITEMS TO DISPLAY AS CARDS (each opens a detail page when clicked):
${itemsList}

DOCUMENT CONTENT FOR REFERENCE (extract real info):
${context.documentContent.substring(0, 4000)}

${context.personaEmphasis}

STRUCTURE REQUIREMENTS:
1. INTRO SECTION:
   - Brief compelling introduction (2-3 sentences) about ${pageTitle}
   - Use text from the document content above

2. FEATURE CARDS GRID (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6):
   - Each card MUST have: data-topic="[item-slug]" data-parent-segment="${context.segmentSlug}"
   - Card structure:
     <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group" data-topic="[slug]" data-parent-segment="${context.segmentSlug}">
       <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
         <i data-feather="[icon]" class="w-6 h-6 text-white"></i>
       </div>
       <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">[Title]</h3>
       <p class="text-gray-600 mb-4">[Real description from content]</p>
       <span class="text-indigo-600 font-medium flex items-center gap-1">
         Learn more <i data-feather="arrow-right" class="w-4 h-4"></i>
       </span>
     </div>

3. STATS/HIGHLIGHTS (optional but recommended):
   - 3-4 key statistics or highlights in a row
   - Use real numbers if available in document content

DESIGN:
- Section background: bg-gray-50 or bg-white
- Max width container: max-w-7xl mx-auto px-4 py-16
- Cards with generous padding and shadow-sm, hover:shadow-xl
- Use Feather icons: <i data-feather="icon-name" class="w-6 h-6"></i>

Output <section data-section="content">.`,
      };

    // COMBINED: cta + footer
    case "footer":
      return {
        system: baseSystem,
        prompt: `Generate COMBINED CTA + FOOTER section.

Company: ${context.companyName}
Primary CTA: "${context.primaryCTA.text}"

⚠️  FOOTER STRUCTURE (NO QUICK LINKS):
- Column 1: Company logo (data-action="back-to-landing") + tagline + copyright
- Column 2: Contact info (if email/phone/address available)
- Column 3: Social media icons (if provided)

⚠️  DO NOT include "Quick Links" or business segment links in footer
⚠️  Logo MUST have data-action="back-to-landing"
⚠️  CTA button MUST have data-action="cta-primary" data-cta-type="contact"

VALIDATION:
□ Logo has data-action="back-to-landing"
□ CTA has data-action + data-cta-type
□ No Quick Links section present
□ Clean, minimal footer design

Output: <footer data-section="footer">`,
      };

    default:
      return { system: baseSystem, prompt: "Generate a placeholder section." };
  }
}

/**
 * Generate the HTML document wrapper
 */
function generateDocumentWrapper(companyName: string): {
  head: string;
  bodyOpen: string;
  bodyClose: string;
} {
  return {
    head: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/feather-icons"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .skeleton-pulse { animation: pulse 1.5s ease-in-out infinite; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; }
    @keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* Hover effects for navigable elements */
    [data-segment], [data-topic], [data-item-id], [data-action] {
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }
    [data-segment]:hover, [data-topic]:hover, [data-item-id]:hover {
      opacity: 0.85;
    }
    [data-action]:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    /* Card hover effects */
    [data-topic]:hover, [data-item-id]:hover {
      box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
      transform: translateY(-4px);
    }
  </style>
</head>
<body class="bg-gray-50 text-gray-900">`,
    bodyOpen: "",
    bodyClose: `<script>
  // Initialize Feather icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
</script>
</body>
</html>`,
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = (await request.json()) as StreamPageRequest;
    const {
      siteId,
      versionId,
      pageType,
      segment,
      topic, // For detail pages
      itemSlug, // Legacy support
      sessionId,
      behaviorSignals,
      context: requestContext, // Navigation context
    } = body;

    // Use topic or itemSlug for detail pages
    const topicSlug = topic || itemSlug;

    // Validate required fields
    if (!siteId || !segment) {
      return new Response(JSON.stringify({ error: "siteId and segment are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For detail pages, topic is required
    if (pageType === "detail" && !topicSlug) {
      return new Response(JSON.stringify({ error: "topic is required for detail pages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Starting streaming page generation", {
      siteId,
      pageType,
      segment,
      topic: topicSlug,
      context: requestContext,
    });

    // Get site and content structure using service client (widget routes are unauthenticated)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: siteRow } = await serviceSupabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .single();

    if (!siteRow) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const site = siteRow as {
      id: string;
      title?: string;
      brand_assets?: { logo?: { url?: string } };
      persona_detection_enabled?: boolean;
    };

    // Get content structure using service client (widget routes are unauthenticated)
    const { data: contentStructureRow } = await serviceSupabase
      .from("site_content_structure")
      .select("*")
      .eq("site_id", siteId)
      .single();

    // Content structure is optional - we can use dynamic detection if not available
    const contentStructure = contentStructureRow
      ? {
          segments: contentStructureRow.segments || [],
          primaryCTA: contentStructureRow.primary_cta || { text: "Get Started", action: "signup" },
          secondaryCTAs: contentStructureRow.secondary_ctas || [],
        }
      : {
          segments: [],
          primaryCTA: { text: "Get Started", action: "signup" },
          secondaryCTAs: [],
        };

    // Find the specific segment or use dynamic detection
    let segmentData = contentStructure.segments.find((s: { slug: string }) => s.slug === segment);

    // If segment not found in content structure, use dynamic detection
    if (!segmentData) {
      const detectedType = detectSegmentType(segment);
      const segmentName = formatSlugToName(segment);

      logger.info("Using dynamic segment detection for streaming", {
        segment,
        detectedType,
        segmentName,
      });

      // Create a dynamic segment data object
      segmentData = {
        name: segmentName,
        slug: segment,
        description: `Explore ${segmentName} - comprehensive information and resources.`,
        items: [], // Will be populated dynamically
      };
    }

    // Get document content using service client
    const { data: documents } = await serviceSupabase
      .from("documents")
      .select("extracted_text")
      .eq("site_id", siteId);

    const documentContent = (documents || [])
      .filter(
        (d: { extracted_text: string | null }) =>
          d.extracted_text && d.extracted_text.trim().length > 0
      )
      .map((d: { extracted_text: string }) => d.extracted_text)
      .join("\n\n");

    // Extract brand colors
    let brandColors = "";
    const logoUrl = site.brand_assets?.logo?.url || null;
    if (logoUrl) {
      try {
        const colors = await extractColorsFromImage(logoUrl);
        if (colors) {
          brandColors = generateColorPrompt(colors);
        }
      } catch (e) {
        logger.warn("Failed to extract brand colors", { error: e });
      }
    }

    // Detect persona
    let personaEmphasis = "";
    if (site.persona_detection_enabled && behaviorSignals) {
      const detection = detectPersona(behaviorSignals);
      if (detection.persona !== "general") {
        personaEmphasis = getPersonaEmphasis(detection.persona);
      }
    }

    // For detail pages, find the specific topic info
    let topicInfo: { name: string; slug: string; description: string } | undefined;
    if (pageType === "detail" && topicSlug) {
      // Look for topic in segment items (safely handle empty/undefined items)
      const items = segmentData.items || [];
      topicInfo = items.find((item: { slug: string }) => item.slug === topicSlug);

      // If not found, create from slug
      if (!topicInfo) {
        topicInfo = {
          name: formatSlugToName(topicSlug),
          slug: topicSlug,
          description: `Detailed information about ${formatSlugToName(topicSlug)}`,
        };
      }
    }

    // Determine page slug for caching/navigation
    const pageSlug = pageType === "detail" && topicSlug ? `${segment}/${topicSlug}` : segment;

    // Prepare context for section generation
    const context: SectionContext = {
      companyName: site.title || "Company",
      segmentName: segmentData.name,
      segmentSlug: segment,
      segmentDescription:
        pageType === "detail" && topicInfo ? topicInfo.description : segmentData.description,
      items: (segmentData.items || []).map(
        (item: { name: string; slug: string; description: string; hasDetailPage?: boolean }) => ({
          name: item.name,
          slug: item.slug,
          description: item.description || "",
          hasDetailPage: item.hasDetailPage ?? true,
        })
      ),
      brandColors,
      logoUrl,
      allSegments: contentStructure.segments.map((s: { name: string; slug: string }) => ({
        name: s.name,
        slug: s.slug,
      })),
      primaryCTA: contentStructure.primaryCTA,
      personaEmphasis,
      documentContent,
      // Detail page specific
      pageType: pageType || "segment",
      topicName: topicInfo?.name,
      topicSlug: topicSlug,
      parentSegment: pageType === "detail" ? segment : undefined,
      navigationContext: requestContext,
    };

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        try {
          // Send initial skeleton structure - OPTIMIZED: 3 sections instead of 5
          const sections = ["header", "content", "footer"];
          sendEvent("skeleton", { sections, pageSlug, pageType: context.pageType });

          // Generate document wrapper
          const wrapper = generateDocumentWrapper(context.companyName);
          sendEvent("wrapper", {
            head: wrapper.head,
            bodyOpen: wrapper.bodyOpen,
            bodyClose: wrapper.bodyClose,
          });

          // PARALLEL GENERATION: Generate all sections simultaneously
          // This reduces total time from ~20-30s (sequential) to ~8-12s (parallel)
          const sectionResults: { [key: string]: string } = {};

          // Create parallel generation promises
          const generationPromises = sections.map(async (section) => {
            sendEvent("section-start", { id: section });

            const { system, prompt } = generateSectionPrompt(section, context);

            try {
              // Use streamText for each section
              // Header section needs more tokens for navbar + hero combined
              const maxTokens = section === "header" ? 6000 : 4000;
              const { textStream } = streamText({
                model: defaultGenerationModel,
                system,
                prompt,
                temperature: 0.7,
                maxOutputTokens: maxTokens,
              });

              let sectionHtml = "";
              for await (const chunk of textStream) {
                sectionHtml += chunk;
                // Send incremental chunks for real-time feedback
                sendEvent("section-chunk", { id: section, chunk });
              }

              // Clean up the section HTML
              sectionHtml = sectionHtml
                .replace(/^```html\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

              // Validate section - lenient validation, only fails if truly broken
              const validation = validateSectionHtml(section, sectionHtml);

              // Log warnings if any
              if (validation.warnings.length > 0) {
                logger.info(`Section "${section}" generated with warnings`, {
                  siteId,
                  segment,
                  warnings: validation.warnings,
                  htmlLength: sectionHtml.length,
                });
              }

              // Store result and send completion event
              sectionResults[section] = sectionHtml;
              sendEvent("section-complete", { id: section, html: sectionHtml });

              return { section, success: validation.isValid, html: sectionHtml };
            } catch (sectionError) {
              logger.error(`Failed to generate section: ${section}`, sectionError);
              sendEvent("section-error", { id: section, error: "Failed to generate section" });
              sectionResults[section] =
                `<div data-section="${section}" class="p-8 text-center text-gray-500">Failed to load ${section}</div>`;
              return { section, success: false, html: "" };
            }
          });

          // Wait for ALL sections to complete (in parallel)
          const results = await Promise.all(generationPromises);

          // Count successful vs failed sections
          const successCount = results.filter((r) => r.success).length;
          const failedSections = results.filter((r) => !r.success).map((r) => r.section);

          // Send completion event with validation status
          sendEvent("complete", {
            pageSlug,
            pageType: context.pageType,
            cached: false,
            sectionsGenerated: Object.keys(sectionResults).length,
            validationStatus: {
              allValid: failedSections.length === 0,
              successCount,
              failedSections,
            },
          });

          logger.info("Parallel generation complete", {
            siteId,
            pageSlug,
            pageType: context.pageType,
            sectionsGenerated: Object.keys(sectionResults).length,
            successCount,
            failedSections,
          });
        } catch (error) {
          logger.error("Streaming error", error);
          sendEvent("error", { message: "Stream generation failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Failed to start streaming", error);
    return new Response(JSON.stringify({ error: "Failed to start streaming" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
