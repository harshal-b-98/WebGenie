/**
 * Content Discovery Service
 *
 * Analyzes uploaded documents to dynamically discover:
 * - Website segments (not hardcoded Features/Solutions/Platform/FAQ)
 * - Items within each segment
 * - Page hierarchy depth
 * - Lead capture placements
 * - Business type
 */

import { generateText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";
import { createClient } from "@/lib/db/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import * as documentService from "./document-service";
import {
  CONTENT_DISCOVERY_SYSTEM_PROMPT,
  generateContentDiscoveryPrompt,
  validateDiscoveryResult,
  type ContentDiscoveryResult,
  type DiscoveredSegment,
  type DiscoveredItem,
  type CTA,
  type BusinessType,
} from "@/lib/ai/prompts/content-discovery";
import crypto from "crypto";

export type { ContentDiscoveryResult, DiscoveredSegment, DiscoveredItem, CTA, BusinessType };

export interface ContentStructure {
  id: string;
  siteId: string;
  segments: DiscoveredSegment[];
  maxDepth: number;
  leadCapturePoints: string[];
  primaryCTA: CTA;
  secondaryCTAs: CTA[];
  businessType: BusinessType;
  analysisVersion: number;
  lastAnalyzedAt: Date;
  documentHash: string;
  analysisConfidence: number;
}

/**
 * Get content structure for a site
 * Uses service role client to bypass RLS for server-side access
 */
export async function getContentStructure(siteId: string): Promise<ContentStructure | null> {
  // Use service role to bypass RLS - content structure is not sensitive
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("site_content_structure")
    .select("*")
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as {
    id: string;
    site_id: string;
    business_type: BusinessType;
    segments: DiscoveredSegment[];
    max_depth?: number;
    lead_capture_points?: string[];
    primary_cta?: CTA;
    secondary_ctas?: CTA[];
    analysis_confidence?: number;
    document_hash?: string;
    last_analyzed_at?: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: row.id,
    siteId: row.site_id,
    segments: row.segments || [],
    maxDepth: row.max_depth || 2,
    leadCapturePoints: row.lead_capture_points || [],
    primaryCTA: row.primary_cta || {
      text: "Get Started",
      action: "contact",
      style: "primary",
    },
    secondaryCTAs: row.secondary_ctas || [],
    businessType: row.business_type,
    analysisVersion: 1, // Default version since it's not stored
    lastAnalyzedAt: row.last_analyzed_at ? new Date(row.last_analyzed_at) : new Date(),
    documentHash: row.document_hash || "",
    analysisConfidence: row.analysis_confidence || 0,
  };
}

/**
 * Compute hash of document content to detect changes
 */
function computeDocumentHash(documentContent: string): string {
  return crypto.createHash("md5").update(documentContent).digest("hex");
}

/**
 * Check if re-analysis is needed
 */
export async function needsReanalysis(siteId: string): Promise<boolean> {
  const structure = await getContentStructure(siteId);
  if (!structure) {
    return true; // No existing analysis
  }

  // Get current document content
  const documents = await documentService.getDocumentsForSite(siteId);
  const documentContent = documents
    .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
    .map((d) => d.extracted_text)
    .join("\n\n");

  if (!documentContent) {
    return false; // No documents to analyze
  }

  const currentHash = computeDocumentHash(documentContent);
  return currentHash !== structure.documentHash;
}

/**
 * Analyze content structure for a site
 * This is the main function that discovers segments, items, and CTAs from documents
 */
export async function analyzeContentStructure(
  siteId: string,
  options: { force?: boolean } = {}
): Promise<ContentStructure> {
  const { force = false } = options;

  // Check if re-analysis is needed
  if (!force) {
    const existing = await getContentStructure(siteId);
    if (existing && !(await needsReanalysis(siteId))) {
      logger.info("Content structure up to date, skipping analysis", { siteId });
      return existing;
    }
  }

  logger.info("Starting content discovery analysis", { siteId, force });

  // Get site info
  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("title").eq("id", siteId).single();
  const companyName = (site as { title?: string } | null)?.title || undefined;

  // Get all documents
  const documents = await documentService.getDocumentsForSite(siteId);
  const documentContent = documents
    .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
    .map((d) => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
    .join("\n\n");

  if (!documentContent || documentContent.trim().length < 100) {
    logger.warn("Insufficient document content for analysis", {
      siteId,
      contentLength: documentContent.length,
    });
    // Return a default structure
    return saveDefaultStructure(siteId, documentContent);
  }

  // Truncate if too long (keep first 50k characters for analysis)
  const truncatedContent = documentContent.substring(0, 50000);
  const documentHash = computeDocumentHash(documentContent);

  // Generate analysis prompt
  const userPrompt = generateContentDiscoveryPrompt(truncatedContent, companyName);

  try {
    // Call AI for analysis
    const { text: rawResponse } = await generateText({
      model: defaultChatModel,
      system: CONTENT_DISCOVERY_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3, // Lower temperature for more consistent structure
      maxOutputTokens: 4000,
    });

    // Parse JSON response
    let analysisResult: ContentDiscoveryResult;
    try {
      // Clean up response - remove any markdown code blocks
      let cleanedResponse = rawResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      analysisResult = JSON.parse(cleanedResponse);

      if (!validateDiscoveryResult(analysisResult)) {
        throw new Error("Invalid analysis result structure");
      }
    } catch (parseError) {
      logger.error("Failed to parse content discovery result", parseError, {
        siteId,
        rawResponse: rawResponse.substring(0, 500),
      });
      // Return default structure on parse failure
      return saveDefaultStructure(siteId, documentContent);
    }

    // Save to database
    const structure = await saveContentStructure(siteId, analysisResult, documentHash);

    logger.info("Content discovery analysis completed", {
      siteId,
      segmentCount: structure.segments.length,
      businessType: structure.businessType,
      confidence: structure.analysisConfidence,
    });

    return structure;
  } catch (error) {
    logger.error("Content discovery analysis failed", error, { siteId });
    // Return default structure on failure
    return saveDefaultStructure(siteId, documentContent);
  }
}

/**
 * Save content structure to database
 */
async function saveContentStructure(
  siteId: string,
  result: ContentDiscoveryResult,
  documentHash: string
): Promise<ContentStructure> {
  // Use service role to bypass RLS for upsert
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await serviceSupabase
    .from("site_content_structure")
    .upsert(
      {
        site_id: siteId,
        business_type: result.businessType,
        segments: result.segments,
        max_depth: result.maxDepth,
        lead_capture_points: result.leadCapturePoints,
        primary_cta: result.primaryCTA,
        secondary_ctas: result.secondaryCTAs,
        analysis_confidence: result.analysisConfidence,
        document_hash: documentHash,
        last_analyzed_at: new Date().toISOString(),
      },
      { onConflict: "site_id" }
    )
    .select()
    .single();

  if (error) {
    logger.error("Failed to save content structure", {
      error: JSON.stringify(error),
      siteId,
      errorMessage: error.message,
      errorCode: error.code,
    });
    throw error;
  }

  const row = data as {
    id: string;
    site_id: string;
    business_type: BusinessType;
    segments: DiscoveredSegment[];
    max_depth: number;
    lead_capture_points: string[];
    primary_cta: CTA;
    secondary_ctas: CTA[];
    analysis_confidence: number;
    document_hash: string;
    last_analyzed_at: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: row.id,
    siteId: row.site_id,
    segments: row.segments,
    maxDepth: row.max_depth,
    leadCapturePoints: row.lead_capture_points,
    primaryCTA: row.primary_cta,
    secondaryCTAs: row.secondary_ctas,
    businessType: row.business_type,
    analysisVersion: 1, // Default version since it's not stored
    lastAnalyzedAt: new Date(row.last_analyzed_at),
    documentHash: row.document_hash,
    analysisConfidence: row.analysis_confidence,
  };
}

/**
 * Save a default structure when analysis fails or content is insufficient
 */
async function saveDefaultStructure(
  siteId: string,
  documentContent: string
): Promise<ContentStructure> {
  const documentHash = computeDocumentHash(documentContent || "");

  // Provide About/Contact as fallback segments when no business content discovered
  // Landing page needs segments to display navigation cards
  const defaultResult: ContentDiscoveryResult = {
    segments: [
      {
        id: "about",
        name: "About",
        slug: "about",
        description: "Learn more about us",
        items: [],
        suggestedInteractions: ["contact-sales"],
        priority: 1,
      },
      {
        id: "contact",
        name: "Contact",
        slug: "contact",
        description: "Get in touch with our team",
        items: [],
        suggestedInteractions: [],
        priority: 2,
      },
    ],
    maxDepth: 1,
    leadCapturePoints: ["contact"],
    primaryCTA: { text: "Get Started", action: "contact", style: "primary" },
    secondaryCTAs: [{ text: "Learn More", action: "learn-more", style: "secondary" }],
    businessType: "other",
    analysisConfidence: 0.0, // Low confidence - no documents analyzed
  };

  return saveContentStructure(siteId, defaultResult, documentHash);
}

/**
 * Get a specific segment from the content structure
 */
export async function getSegment(
  siteId: string,
  segmentSlug: string
): Promise<DiscoveredSegment | null> {
  const structure = await getContentStructure(siteId);
  if (!structure) return null;

  return structure.segments.find((s) => s.slug === segmentSlug) || null;
}

/**
 * Get a specific item from a segment
 */
export async function getItem(
  siteId: string,
  segmentSlug: string,
  itemSlug: string
): Promise<{ segment: DiscoveredSegment; item: DiscoveredItem } | null> {
  const segment = await getSegment(siteId, segmentSlug);
  if (!segment) return null;

  const item = segment.items.find((i) => i.slug === itemSlug);
  if (!item) return null;

  return { segment, item };
}

/**
 * Clear content structure for a site (force re-analysis on next generation)
 */
export async function clearContentStructure(siteId: string): Promise<void> {
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await serviceSupabase.from("site_content_structure").delete().eq("site_id", siteId);

  logger.info("Content structure cleared", { siteId });
}

/**
 * Get list of available detail pages for a site
 * Returns a set of slugs that have content and can be linked to
 * Use this to prevent generating "Learn More" buttons for non-existent content
 */
export async function getAvailableDetailPages(siteId: string): Promise<Set<string>> {
  const structure = await getContentStructure(siteId);
  const available = new Set<string>();

  if (!structure) {
    return available;
  }

  for (const segment of structure.segments) {
    // Add segment itself if it has content
    if (segment.hasDetailPage !== false) {
      available.add(segment.slug);
    }

    // Add items within the segment
    for (const item of segment.items || []) {
      if (item.hasDetailPage !== false) {
        available.add(`${segment.slug}/${item.slug}`);
      }
    }
  }

  logger.info("Available detail pages retrieved", { siteId, count: available.size });
  return available;
}

/**
 * Get topic-relevant content from documents
 * Scores documents by relevance to the topic and returns the most relevant content
 */
export async function getTopicRelevantContent(
  siteId: string,
  topic: string,
  maxChars: number = 8000
): Promise<string> {
  const documents = await documentService.getDocumentsForSite(siteId);

  if (!documents || documents.length === 0) {
    return "";
  }

  // Calculate relevance scores for each document
  const topicWords = topic.toLowerCase().split(/[-_\s]+/);
  const scored = documents
    .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
    .map((doc) => {
      const text = doc.extracted_text?.toLowerCase() || "";
      let score = 0;

      // Score based on keyword matches
      for (const word of topicWords) {
        if (word.length < 3) continue;
        const regex = new RegExp(word, "gi");
        const matches = text.match(regex);
        score += matches ? matches.length : 0;
      }

      // Bonus for filename match
      if (doc.filename.toLowerCase().includes(topic.toLowerCase())) {
        score += 10;
      }

      return { doc, score };
    });

  // Sort by relevance and take top documents
  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // If no relevant docs found, return first document
  if (relevant.length === 0 && documents.length > 0) {
    const firstDoc = documents[0];
    return (firstDoc.extracted_text || "").slice(0, maxChars);
  }

  // Combine relevant content up to maxChars
  let combined = "";
  for (const { doc } of relevant) {
    const text = doc.extracted_text || "";
    if (combined.length + text.length > maxChars) {
      combined += text.slice(0, maxChars - combined.length);
      break;
    }
    combined += `--- ${doc.filename} ---\n${text}\n\n`;
  }

  logger.info("Topic-relevant content retrieved", {
    siteId,
    topic,
    relevantDocs: relevant.length,
    contentLength: combined.length,
  });

  return combined;
}

/**
 * Get related segments for cross-navigation
 * Returns segments related to the current segment for "Explore More" sections
 */
export async function getRelatedSegments(
  siteId: string,
  currentSegment: string,
  limit: number = 3
): Promise<Array<{ name: string; slug: string; description: string }>> {
  const structure = await getContentStructure(siteId);

  if (!structure) {
    return [];
  }

  // Filter out current segment and return others
  const related = structure.segments
    .filter((s) => s.slug !== currentSegment)
    .slice(0, limit)
    .map((s) => ({
      name: s.name,
      slug: s.slug,
      description: s.description || `Learn more about ${s.name}`,
    }));

  return related;
}
