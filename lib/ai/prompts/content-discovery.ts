/**
 * Content Discovery Prompt
 *
 * AI analyzes uploaded business documents to determine:
 * - What segments/pages the website should have (NOT hardcoded)
 * - What items exist within each segment
 * - Which items need detail pages
 * - Where lead capture forms should appear
 * - Business type classification
 */

export const CONTENT_DISCOVERY_SYSTEM_PROMPT = `You are an expert business analyst and information architect.

Your task is to analyze business documents and determine the optimal website structure.

CRITICAL: You must NOT use hardcoded categories like "Features, Solutions, Platform, FAQ".
Instead, discover the ACTUAL content structure from the documents.

ANALYSIS APPROACH:
1. Read all document content thoroughly
2. Identify distinct content categories (could be: Products, Services, Industries, Use Cases, Integrations, Team, Pricing, etc.)
3. For each category, list specific items mentioned
4. Determine which items have enough content for a dedicated detail page
5. Identify appropriate CTAs based on business type
6. Determine where lead capture makes sense

OUTPUT FORMAT:
Return ONLY valid JSON. No explanations, no markdown code blocks, just raw JSON.`;

export interface ContentDiscoveryResult {
  segments: DiscoveredSegment[];
  maxDepth: number;
  leadCapturePoints: string[];
  primaryCTA: CTA;
  secondaryCTAs: CTA[];
  businessType: BusinessType;
  analysisConfidence: number;
}

export interface DiscoveredSegment {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  items: DiscoveredItem[];
  suggestedInteractions: InteractionType[];
  priority: number; // 1 = highest priority, show first in nav
  hasDetailPage?: boolean; // Whether this segment has a dedicated page (defaults to true)
}

export interface DiscoveredItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  hasDetailPage: boolean;
  contentDepth: number; // word count in source documents
  suggestedCTAs: string[];
  relatedItems?: string[]; // IDs of related items
}

export interface CTA {
  text: string;
  action: "demo" | "signup" | "contact" | "pricing" | "learn-more" | "custom";
  style?: "primary" | "secondary" | "outline";
  customUrl?: string;
}

export type InteractionType =
  | "view-details"
  | "request-demo"
  | "compare"
  | "get-pricing"
  | "contact-sales"
  | "download"
  | "watch-video"
  | "how-it-works"
  | "case-study"
  | "free-trial";

export type BusinessType =
  | "product" // SaaS, software, hardware
  | "service" // Consulting, professional services
  | "marketplace" // Multi-vendor platforms
  | "agency" // Creative/marketing agencies
  | "ecommerce" // Online retail
  | "other";

export function generateContentDiscoveryPrompt(
  documentContent: string,
  companyName?: string
): string {
  return `Analyze the following business documents and determine the optimal website structure.

${companyName ? `COMPANY NAME: ${companyName}` : ""}

DOCUMENTS TO ANALYZE:
${documentContent}

⚠️ CRITICAL RULE: NEVER CREATE "ABOUT" OR "CONTACT" SEGMENTS ⚠️
About and Contact pages are supplementary pages managed separately by the system.
They are NOT business content segments and must NEVER appear in your segment analysis.

Focus ONLY on discovering BUSINESS content from the documents:
- Products, Services, Features, Solutions, Industries, Use Cases, Integrations, Pricing, Team, etc.
- DO NOT include: About, Contact, About Us, Contact Us, Company Info

ANALYSIS TASKS:

1. IDENTIFY SEGMENTS
   - What main navigation sections should this website have?
   - Examples: Products, Services, Industries, Solutions, Integrations, Pricing, Team, Case Studies
   - DO NOT default to generic "Features, Solutions, Platform, FAQ" unless the content truly fits
   - Each segment should have clear content in the documents

2. IDENTIFY ITEMS PER SEGMENT
   - What specific items/topics exist within each segment?
   - For each item, estimate content depth (word count of relevant content)
   - Items with 150+ words of content should have hasDetailPage: true
   - Items with less content can be displayed inline

3. DETERMINE INTERACTIONS
   For each segment and item, suggest appropriate interactions:
   - view-details: For items with rich content
   - request-demo: For products/services that need demonstration
   - how-it-works: For processes or complex features
   - get-pricing: When pricing information is relevant
   - case-study: When success stories exist
   - free-trial: For software products

4. LEAD CAPTURE PLACEMENT
   Where should lead capture forms appear?
   - After detailed product/service pages
   - On pricing pages
   - Contact sections
   - Newsletter signup points

5. CLASSIFY BUSINESS TYPE
   Based on content, is this:
   - product: Software, SaaS, hardware product company
   - service: Consulting, professional services
   - marketplace: Platform connecting buyers/sellers
   - agency: Creative, marketing, development agency
   - ecommerce: Online retail
   - other: Doesn't fit above categories

6. DETERMINE CTAs
   Based on business type, suggest:
   - Primary CTA: Main action visitors should take
   - Secondary CTAs: Alternative actions

OUTPUT SCHEMA (return ONLY this JSON, no other text):
{
  "segments": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "slug": "url-slug",
      "description": "Brief description for hover/subtitle",
      "icon": "emoji or icon name",
      "items": [
        {
          "id": "item-unique-id",
          "name": "Item Name",
          "slug": "item-slug",
          "description": "Brief item description",
          "hasDetailPage": true,
          "contentDepth": 250,
          "suggestedCTAs": ["Request Demo", "Learn More"],
          "relatedItems": ["other-item-id"]
        }
      ],
      "suggestedInteractions": ["view-details", "request-demo"],
      "priority": 1
    }
  ],
  "maxDepth": 2,
  "leadCapturePoints": ["pricing", "demo", "contact"],
  "primaryCTA": {
    "text": "Start Free Trial",
    "action": "signup",
    "style": "primary"
  },
  "secondaryCTAs": [
    {
      "text": "Schedule Demo",
      "action": "demo",
      "style": "secondary"
    }
  ],
  "businessType": "product",
  "analysisConfidence": 0.85
}

IMPORTANT RULES:
- Segments should be ordered by priority (most important first)
- Only create segments that have actual content in the documents
- Minimum 2 segments, maximum 6 segments
- Each segment should have at least 1 item
- Set hasDetailPage: true only if the item has substantial content (150+ words)
- analysisConfidence should reflect how well the content fits a clear structure (0.0-1.0)

Return ONLY the JSON object, no other text or formatting.`;
}

/**
 * Validate the discovery result structure
 */
export function validateDiscoveryResult(result: unknown): result is ContentDiscoveryResult {
  if (!result || typeof result !== "object") return false;

  const r = result as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(r.segments)) return false;
  if (typeof r.maxDepth !== "number") return false;
  if (!Array.isArray(r.leadCapturePoints)) return false;
  if (!r.primaryCTA || typeof r.primaryCTA !== "object") return false;
  if (!Array.isArray(r.secondaryCTAs)) return false;
  if (typeof r.businessType !== "string") return false;

  // Validate segments
  for (const segment of r.segments as unknown[]) {
    if (!segment || typeof segment !== "object") return false;
    const s = segment as Record<string, unknown>;
    if (typeof s.id !== "string") return false;
    if (typeof s.name !== "string") return false;
    if (typeof s.slug !== "string") return false;
    if (!Array.isArray(s.items)) return false;
  }

  return true;
}

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
