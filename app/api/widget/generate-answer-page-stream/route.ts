/**
 * API Route: Stream Answer Page Generation
 *
 * POST /api/widget/generate-answer-page-stream
 *
 * Uses Server-Sent Events (SSE) to stream answer page sections progressively.
 * Client shows skeleton UI and reveals sections as they're generated.
 */

import { NextRequest } from "next/server";
import { streamText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { generateAnswerPageRequestSchema, formatZodErrors } from "@/lib/validation";
import { ZodError } from "zod";
import { memoryCache, hashString } from "@/lib/cache";

// Service client for public widget access (bypasses RLS)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// CORS headers for widget requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Cache TTL for answer pages (60 minutes)
const ANSWER_PAGE_CACHE_TTL = 60 * 60 * 1000;

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Generate section-specific prompts for answer page streaming
 */
function generateSectionPrompt(
  section: string,
  context: {
    question: string;
    questionTitle: string;
    content: string;
    companyName: string;
    logoUrl: string | null;
    availableSegments: Array<{ name: string; slug: string }>;
  }
): { system: string; prompt: string } {
  const baseSystem = `Generate HTML using Tailwind CSS. Output raw HTML only - no markdown code blocks.

MANDATORY UI RULES:
1. NAV LINKS: Max 20 chars - abbreviate long names
2. ICONS: Use Feather icons ONLY: <i data-feather="icon-name" class="w-5 h-5"></i>
3. HOME: Logo MUST have data-action="back-to-landing"
4. BUTTONS: data-action="cta-primary" data-cta-type="demo|signup|contact" required
5. NO PLACEHOLDERS: No Lorem ipsum, only real content from the answer

Navigation links use data-segment="[slug]".
Include feather.replace() call at end of section.`;

  const navItems = context.availableSegments
    .slice(0, 5)
    .map((s) => `${s.name.substring(0, 20)} (data-segment="${s.slug}")`)
    .join(", ");

  switch (section) {
    case "header":
      return {
        system: baseSystem,
        prompt: `Generate a header section with navbar AND hero for an ANSWER PAGE.

Company: ${context.companyName}
Logo: ${context.logoUrl || "Text logo"}
Nav: ${navItems || "Home"}

QUESTION BEING ANSWERED: "${context.questionTitle}"

STRUCTURE:

1. STICKY NAVBAR:
   - Fixed top-0, backdrop-blur-md bg-white/95 shadow-sm z-50
   - Logo on left with data-action="back-to-landing"
   - Nav links in center (if available)
   - "Ask Another Question" button on right with data-action="open-chat"

2. HERO SECTION (answer page style):
   - min-h-[40vh] with gradient: bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900
   - Centered content

   HERO CONTENT:
   a) Breadcrumb: "Home > Your Question" - make "Home" clickable with data-action="back-to-landing"
   b) Question badge: <span class="px-4 py-2 bg-white/10 rounded-full text-sm text-indigo-300 mb-4 inline-block">Your Question Answered</span>
   c) Title: "${context.questionTitle}" - text-3xl md:text-4xl font-bold text-white text-center
   d) Subtitle: "Here's what we found for you" - text-lg text-gray-300 mt-4

Output <header data-section="header"> containing nav and hero.`,
      };

    case "content":
      return {
        system: baseSystem,
        prompt: `Generate the MAIN CONTENT section for an answer page.

QUESTION: "${context.question}"
TITLE: "${context.questionTitle}"

ANSWER CONTENT TO DISPLAY:
${context.content}

STRUCTURE:
1. Answer container: max-w-4xl mx-auto px-4 py-12

2. Main answer card:
   - bg-white rounded-2xl shadow-lg p-8 md:p-12
   - Formatted answer with proper headings, paragraphs, lists
   - Use the ACTUAL content provided above - format it nicely
   - Add Feather icons where appropriate

3. Key points section (if extractable from content):
   - 2-4 key takeaways in a highlighted box
   - bg-indigo-50 rounded-xl p-6

4. "Was this helpful?" section:
   - Feedback buttons (thumbs up/down)
   - "Ask another question" link with data-action="open-chat"

IMPORTANT: Use the ACTUAL answer content provided above. Format it beautifully but don't invent new information.

Output <section data-section="content">.`,
      };

    case "footer":
      return {
        system: baseSystem,
        prompt: `Generate footer section for an answer page.

Company: ${context.companyName}
Available sections: ${navItems || "Home"}

STRUCTURE:
1. CTA section:
   - "Have more questions?" headline
   - Two buttons:
     - "Chat with us" with data-action="open-chat"
     - "Explore our site" with data-action="back-to-landing"

2. Related topics (if segments available):
   - "Explore more topics" with segment links
   - Each link: data-segment="[slug]"

3. Footer:
   - Dark bg-gray-900
   - Logo (data-action="back-to-landing")
   - Copyright

Output <footer data-section="footer">.`,
      };

    default:
      return { system: baseSystem, prompt: "Generate a placeholder section." };
  }
}

/**
 * Generate the HTML document wrapper
 */
function generateDocumentWrapper(
  companyName: string,
  questionTitle: string
): {
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
  <title>${questionTitle} | ${companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/feather-icons"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    [data-segment], [data-action] { cursor: pointer !important; transition: all 0.2s ease !important; }
    [data-segment]:hover, [data-action]:hover { opacity: 0.85; }
  </style>
</head>
<body class="bg-gray-50 text-gray-900">`,
    bodyOpen: "",
    bodyClose: `<script>
  if (typeof feather !== 'undefined') { feather.replace(); }
</script>
</body>
</html>`,
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate with Zod schema
    let validatedData;
    try {
      validatedData = generateAnswerPageRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Generate answer page stream validation failed", { issues: error.issues });
        return new Response(JSON.stringify(formatZodErrors(error)), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    const { projectId, question, questionSlug, questionTitle, content } = validatedData;

    logger.info("Starting streaming answer page generation", {
      projectId,
      questionSlug,
      contentLength: content.length,
    });

    // Check cache first (return cached if available)
    const questionHash = hashString(question.toLowerCase().trim());
    const cacheKey = `answer_${projectId}_${questionHash}`;

    const cachedPage = memoryCache.pages.get(cacheKey) as
      | { html: string; timestamp: number }
      | undefined;
    if (cachedPage && Date.now() - cachedPage.timestamp < ANSWER_PAGE_CACHE_TTL) {
      logger.info("Returning cached answer page via stream", { projectId, questionSlug });

      // Return cached page as immediate complete event
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          };

          sendEvent("cached", { html: cachedPage.html, pageSlug: `answer/${questionSlug}` });
          sendEvent("complete", {
            pageSlug: `answer/${questionSlug}`,
            cached: true,
            generationTime: Date.now() - startTime,
          });
          controller.close();
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
    }

    // Get site info for branding
    const supabase = getServiceClient();
    const { data: siteData } = await supabase
      .from("sites")
      .select("title, brand_assets")
      .eq("id", projectId)
      .single();

    const brandAssets = (siteData?.brand_assets as { logo?: { url?: string } }) || {};
    const logoUrl = brandAssets.logo?.url || null;
    const companyName = siteData?.title || "Company";

    // Get available segments
    const { data: contentStructure } = await supabase
      .from("site_content_structure")
      .select("segments")
      .eq("site_id", projectId)
      .single();

    const availableSegments = (
      (contentStructure?.segments as Array<{ name: string; slug: string }>) || []
    ).slice(0, 5);

    // Prepare context
    const context = {
      question,
      questionTitle,
      content,
      companyName,
      logoUrl,
      availableSegments,
    };

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        try {
          // Send initial skeleton structure
          const sections = ["header", "content", "footer"];
          sendEvent("skeleton", { sections, pageSlug: `answer/${questionSlug}` });

          // Generate document wrapper
          const wrapper = generateDocumentWrapper(companyName, questionTitle);
          sendEvent("wrapper", {
            head: wrapper.head,
            bodyOpen: wrapper.bodyOpen,
            bodyClose: wrapper.bodyClose,
          });

          // Generate sections in parallel
          const sectionResults: { [key: string]: string } = {};

          const generationPromises = sections.map(async (section) => {
            sendEvent("section-start", { id: section });

            const { system, prompt } = generateSectionPrompt(section, context);

            try {
              const maxTokens = section === "content" ? 4000 : 2000;
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
                sendEvent("section-chunk", { id: section, chunk });
              }

              // Clean up
              sectionHtml = sectionHtml
                .replace(/^```html\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

              sectionResults[section] = sectionHtml;
              sendEvent("section-complete", { id: section, html: sectionHtml });

              return { section, success: true, html: sectionHtml };
            } catch (sectionError) {
              logger.error(`Failed to generate answer section: ${section}`, sectionError);
              sendEvent("section-error", { id: section, error: "Failed to generate section" });
              sectionResults[section] =
                `<div data-section="${section}" class="p-8 text-center text-gray-500">Failed to load</div>`;
              return { section, success: false, html: "" };
            }
          });

          // Wait for all sections
          const results = await Promise.all(generationPromises);

          // Assemble full HTML for caching
          const fullHtml = `${wrapper.head}${wrapper.bodyOpen}${sectionResults.header || ""}${sectionResults.content || ""}${sectionResults.footer || ""}${wrapper.bodyClose}`;

          // Cache in memory
          memoryCache.pages.set(cacheKey, {
            html: fullHtml,
            timestamp: Date.now(),
          });

          // Cache in database
          await supabase.from("site_pages").upsert(
            {
              site_id: projectId,
              page_slug: `answer/${questionSlug}`,
              page_type: "answer",
              html_content: fullHtml,
              metadata: { question, questionTitle, questionHash },
              created_at: new Date().toISOString(),
            } as never,
            { onConflict: "site_id,page_slug" }
          );

          const generationTime = Date.now() - startTime;

          // Send completion
          const successCount = results.filter((r) => r.success).length;
          sendEvent("complete", {
            pageSlug: `answer/${questionSlug}`,
            cached: false,
            generationTime,
            sectionsGenerated: Object.keys(sectionResults).length,
            validationStatus: {
              allValid: successCount === sections.length,
              successCount,
            },
          });

          logger.info("Streaming answer page complete", {
            projectId,
            questionSlug,
            generationTime,
            sectionsGenerated: Object.keys(sectionResults).length,
          });
        } catch (error) {
          logger.error("Streaming answer page error", error);
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
    logger.error("Failed to start answer page streaming", error);
    return new Response(JSON.stringify({ error: "Failed to start streaming" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
