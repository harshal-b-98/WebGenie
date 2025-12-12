import { generateText } from "ai";
import { defaultGenerationModel } from "@/lib/ai/client";
import { GENERATION_SYSTEM_PROMPT, generatePrompt } from "@/lib/ai/prompts/generation";
import {
  LANDING_PAGE_SYSTEM_PROMPT,
  generateLandingPagePrompt,
} from "@/lib/ai/prompts/pages/landing";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import * as documentService from "./document-service";
import * as contentDiscoveryService from "./content-discovery-service";
import {
  extractColorsFromImage,
  generateColorPrompt,
  ExtractedColors,
} from "@/lib/utils/color-extractor";

interface ChatWidgetConfig {
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  welcomeMessage?: string;
}

/**
 * Inject chat widget into generated HTML
 * Adds interactive chat capability for website visitors
 * Only injects if chat widget is enabled in settings
 */
function injectChatWidget(
  html: string,
  siteId: string,
  versionId: string,
  enabled: boolean,
  config: ChatWidgetConfig
): string {
  // Don't inject if chat widget is disabled
  if (!enabled) {
    logger.info("Chat widget disabled, skipping injection", { siteId });
    return html;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1729";
  const position = config.position || "bottom-right";
  const primaryColor = config.primaryColor || "#667eea";
  const welcomeMessage = config.welcomeMessage || "Hi! How can I help you today?";

  const widgetCode = `
  <!-- NextGenWeb Chat Widget -->
  <link rel="stylesheet" href="${appUrl}/chat-widget/widget.css">
  <script>
    window.NEXTGENWEB_CONFIG = {
      projectId: '${siteId}',
      versionId: '${versionId}',
      apiEndpoint: '${appUrl}/api/widget',
      position: '${position}',
      primaryColor: '${primaryColor}',
      welcomeMessage: '${welcomeMessage.replace(/'/g, "\\'")}'
    };
  </script>
  <script src="${appUrl}/chat-widget/widget.js" defer></script>
  <!-- End NextGenWeb Chat Widget -->
`;

  // Inject before closing </body> tag
  if (html.includes("</body>")) {
    return html.replace("</body>", `${widgetCode}</body>`);
  }

  // Fallback: Check for </html> and inject before it
  if (html.includes("</html>")) {
    return html.replace("</html>", `${widgetCode}</body></html>`);
  }

  // Last resort: append at end with proper closing tags
  return html + `${widgetCode}</body></html>`;
}

/**
 * Inject dynamic navigation scripts into generated HTML
 * Enables progressive page generation and segment exploration
 */
function injectDynamicNav(
  html: string,
  siteId: string,
  companyName: string,
  personaDetectionEnabled: boolean
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1729";

  const navCode = `
  <!-- NextGenWeb Dynamic Navigation -->
  <link rel="stylesheet" href="${appUrl}/dynamic-nav/styles.css">
  <script>
    window.NEXTGENWEB_NAV_CONFIG = {
      siteId: '${siteId}',
      apiEndpoint: '${appUrl}/api/widget',
      personaDetectionEnabled: ${personaDetectionEnabled},
      companyName: '${companyName.replace(/'/g, "\\'")}'
    };
  </script>
  <script src="${appUrl}/dynamic-nav/nav-controller.js" defer></script>
  <!-- End NextGenWeb Dynamic Navigation -->
`;

  // Inject before closing </body> tag
  if (html.includes("</body>")) {
    return html.replace("</body>", `${navCode}</body>`);
  }

  // Fallback: append at end
  return html + navCode;
}

interface GenerationInput {
  siteId: string;
  userId: string;
  conversationId?: string;
}

export async function generateWebsite(input: GenerationInput) {
  const { siteId, userId, conversationId } = input;

  try {
    logger.info("Starting website generation", { siteId, userId });

    // Get site details
    const supabase = await createClient();
    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("user_id", userId)
      .single();

    if (!site) {
      throw new Error("Site not found");
    }

    // Type cast for TypeScript
    const siteData = site as {
      id: string;
      title?: string;
      description?: string;
      brand_assets?: { logo?: { url?: string }; socialMedia?: Record<string, string> };
      dynamic_pages_enabled?: boolean;
      persona_detection_enabled?: boolean;
      chat_widget_enabled?: boolean;
      chat_widget_config?: ChatWidgetConfig;
    };

    // Extract brand assets (logo, social media) from site
    const brandAssets = siteData.brand_assets || {};
    const logoUrl = brandAssets.logo?.url || null;
    const socialMedia = brandAssets.socialMedia || {};

    // Check dynamic page and persona settings
    const dynamicPagesEnabled = siteData.dynamic_pages_enabled ?? true;
    const personaDetectionEnabled = siteData.persona_detection_enabled ?? false;

    // Chat widget settings
    const chatWidgetEnabled = siteData.chat_widget_enabled ?? true;
    const chatWidgetConfig = siteData.chat_widget_config || {};

    // Website description from settings
    const websiteDescription = siteData.description || "";

    logger.info("Brand assets found", {
      hasLogo: !!logoUrl,
      socialMediaPlatforms: Object.keys(socialMedia).filter((k) => socialMedia[k]),
    });

    // Extract colors from logo if available
    let brandColors: ExtractedColors | null = null;
    let colorPromptSection = "";
    if (logoUrl) {
      try {
        logger.info("Extracting colors from logo", { logoUrl });
        brandColors = await extractColorsFromImage(logoUrl);
        if (brandColors) {
          colorPromptSection = generateColorPrompt(brandColors);
          logger.info("Brand colors extracted successfully", { brandColors });
        }
      } catch (error) {
        logger.warn("Failed to extract colors from logo", { error, logoUrl });
      }
    }

    // Get FULL document content (not just summaries)
    const documents = await documentService.getDocumentsForSite(siteId);

    console.log("Documents found for generation:", documents.length);
    console.log("Documents with text:", documents.filter((d) => d.extracted_text).length);

    const fullDocumentText = documents
      .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
      .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
      .join("\n\n");

    const documentSummaries = documents
      .filter((d) => d.summary && d.summary.trim().length > 0)
      .map((d) => d.summary)
      .join("\n\n");

    console.log("Full document text length:", fullDocumentText.length);
    console.log("Document summaries length:", documentSummaries.length);

    // Get conversation messages to extract requirements
    let requirements: Record<string, unknown> = {};
    if (conversationId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("sequence_number");

      // Extract requirements from conversation
      const conversationText = messages
        ?.filter((m) => (m as { role: string }).role === "user")
        .map((m) => (m as { content: string }).content)
        .join(" ");

      const siteData = site as { site_type?: string; target_audience?: string; main_goal?: string };

      requirements = {
        websiteType: siteData.site_type || "landing page",
        targetAudience: siteData.target_audience,
        mainGoal: siteData.main_goal,
        businessDescription: conversationText,
        documentContent: fullDocumentText,
        documentSummary: documentSummaries,
        // Website description from settings
        websiteDescription: websiteDescription,
        // Brand assets from settings
        logoUrl: logoUrl,
        socialMedia: socialMedia,
        brandColors: colorPromptSection,
      };
    } else {
      requirements = {
        websiteType: "landing page",
        documentContent: fullDocumentText,
        documentSummary: documentSummaries,
        // Website description from settings
        websiteDescription: websiteDescription,
        // Brand assets from settings
        logoUrl: logoUrl,
        socialMedia: socialMedia,
        brandColors: colorPromptSection,
      };
    }

    // Generate website code
    const startTime = Date.now();

    // Choose prompt based on dynamic pages setting
    let systemPrompt: string;
    let userPrompt: string;

    if (dynamicPagesEnabled) {
      // Use minimal landing page prompt for progressive generation
      logger.info("Using minimal landing page prompt (dynamic pages enabled)");

      // Get AI-discovered content structure
      let contentStructure = null;
      try {
        contentStructure = await contentDiscoveryService.getContentStructure(siteId);
        if (contentStructure) {
          logger.info("Using AI-discovered content structure", {
            siteId,
            segments: contentStructure.segments.length,
            businessType: contentStructure.businessType,
          });
        } else {
          logger.info("No content structure found, will use defaults", { siteId });
        }
      } catch (error) {
        logger.warn("Failed to get content structure, using defaults", { error, siteId });
      }

      systemPrompt = LANDING_PAGE_SYSTEM_PROMPT;
      userPrompt = generateLandingPagePrompt({
        documentContent: requirements.documentContent as string | undefined,
        logoUrl: requirements.logoUrl as string | null | undefined,
        brandColors: requirements.brandColors as string | undefined,
        websiteType: requirements.websiteType as string | undefined,
        targetAudience: requirements.targetAudience as string | undefined,
        mainGoal: requirements.mainGoal as string | undefined,
        websiteDescription: requirements.websiteDescription as string | undefined,
        contentStructure: contentStructure,
        // Pass social media links from settings
        socialMedia: requirements.socialMedia as
          | {
              linkedin?: string;
              twitter?: string;
              facebook?: string;
              instagram?: string;
              youtube?: string;
            }
          | undefined,
      });
    } else {
      // Use full content-heavy prompt (legacy mode)
      logger.info("Using full generation prompt (dynamic pages disabled)");
      systemPrompt = GENERATION_SYSTEM_PROMPT;
      userPrompt = generatePrompt(requirements);
    }

    const { text: rawHtmlContent } = await generateText({
      model: defaultGenerationModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: dynamicPagesEnabled ? 8000 : 16000, // Smaller for minimal landing
    });

    const generationTime = Date.now() - startTime;

    // Clean up HTML - remove markdown code blocks if present
    let htmlContent = rawHtmlContent;

    // Remove markdown code block wrappers (```html ... ```)
    if (htmlContent.includes("```")) {
      htmlContent = htmlContent
        .replace(/^```html\s*/i, "") // Remove opening ```html
        .replace(/^```\s*/i, "") // Remove opening ``` without language
        .replace(/\s*```$/i, "") // Remove closing ```
        .trim();
    }

    // Ensure it starts with <!DOCTYPE or <html
    if (!htmlContent.startsWith("<!DOCTYPE") && !htmlContent.startsWith("<html")) {
      const doctypeIndex = htmlContent.indexOf("<!DOCTYPE");
      const htmlIndex = htmlContent.indexOf("<html");
      const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex >= 0 ? htmlIndex : 0;
      if (startIndex > 0) {
        htmlContent = htmlContent.substring(startIndex);
      }
    }

    logger.info("HTML cleaned", {
      originalLength: rawHtmlContent.length,
      cleanedLength: htmlContent.length,
      startsWithDoctype: htmlContent.startsWith("<!DOCTYPE"),
    });

    // Get next version number
    const { count } = await supabase
      .from("site_versions")
      .select("*", { count: "exact", head: true })
      .eq("site_id", siteId);

    const nextVersionNumber = (count || 0) + 1;

    // Save as version (initially without widget)
    const { data: version, error: versionError } = await supabase
      .from("site_versions")
      .insert({
        site_id: siteId,
        version_number: nextVersionNumber,
        html_content: htmlContent,
        generation_type: nextVersionNumber === 1 ? "initial" : "refinement",
        ai_provider: "anthropic",
        model: "claude-sonnet-4.5",
        generation_time_ms: generationTime,
        created_by: userId,
        prompt_context: requirements,
      } as never)
      .select()
      .single();

    if (versionError || !version) {
      console.error("Failed to save version:", versionError);
      throw new Error(`Failed to save version: ${versionError?.message || "unknown error"}`);
    }

    const versionId = (version as { id: string }).id;

    // NOW inject chat widget with correct versionId (only if enabled)
    let enhancedHtml = injectChatWidget(
      htmlContent,
      siteId,
      versionId,
      chatWidgetEnabled,
      chatWidgetConfig
    );

    // Inject dynamic navigation if enabled
    if (dynamicPagesEnabled) {
      const companyName = (site as { title?: string }).title || "Company";
      enhancedHtml = injectDynamicNav(enhancedHtml, siteId, companyName, personaDetectionEnabled);
      logger.info("Dynamic navigation injected", { siteId, personaDetectionEnabled });
    }

    // Update version with widget-enhanced HTML
    await supabase
      .from("site_versions")
      .update({
        html_content: enhancedHtml,
      } as never)
      .eq("id", versionId);

    // Update site with current version
    await supabase
      .from("sites")
      .update({
        current_version_id: versionId,
        status: "generated",
      } as never)
      .eq("id", siteId);

    logger.info("Website generated successfully with chat widget", {
      siteId,
      versionId,
      generationTime,
    });

    return {
      versionId,
      htmlContent: enhancedHtml,
      generationTime,
    };
  } catch (error) {
    logger.error("Website generation failed", error, { siteId, userId });
    throw error;
  }
}
