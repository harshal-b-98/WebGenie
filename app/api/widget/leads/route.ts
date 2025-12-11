/**
 * API Route: Lead Capture
 *
 * POST /api/widget/leads
 *
 * Receives lead form submissions from generated websites
 * and stores them in the site_leads table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

// CORS headers for widget requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// Validation schema for lead submission
const leadSchema = z.object({
  siteId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  message: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  sourcePage: z.string().optional(),
  sourceSegment: z.string().optional(),
  formType: z.enum(["demo", "contact", "newsletter", "pricing", "custom"]).optional(),
  formId: z.string().optional(),
  sessionId: z.string().optional(),
  detectedPersona: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = leadSchema.safeParse(body);
    if (!validation.success) {
      logger.warn("Invalid lead submission", { errors: validation.error.issues });
      return NextResponse.json(
        { error: "Invalid submission", details: validation.error.issues },
        { status: 400, headers: corsHeaders }
      );
    }

    const data = validation.data;

    // Use service role client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify site exists
    const { data: site, error: siteError } = await serviceSupabase
      .from("sites")
      .select("id, title")
      .eq("id", data.siteId)
      .single();

    if (siteError || !site) {
      logger.warn("Lead submission for unknown site", { siteId: data.siteId });
      return NextResponse.json({ error: "Site not found" }, { status: 404, headers: corsHeaders });
    }

    // Insert lead
    const { data: lead, error: insertError } = await serviceSupabase
      .from("site_leads")
      .insert({
        site_id: data.siteId,
        email: data.email,
        name: data.name || null,
        company: data.company || null,
        phone: data.phone || null,
        job_title: data.jobTitle || null,
        message: data.message || null,
        custom_fields: data.customFields || {},
        source_page: data.sourcePage || null,
        source_segment: data.sourceSegment || null,
        form_type: data.formType || "contact",
        form_id: data.formId || null,
        session_id: data.sessionId || null,
        detected_persona: data.detectedPersona || null,
        referrer: data.referrer || null,
        utm_source: data.utmSource || null,
        utm_medium: data.utmMedium || null,
        utm_campaign: data.utmCampaign || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("Failed to save lead", insertError, { siteId: data.siteId });
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500, headers: corsHeaders }
      );
    }

    logger.info("Lead captured", {
      leadId: lead?.id,
      siteId: data.siteId,
      formType: data.formType,
      sourcePage: data.sourcePage,
    });

    return NextResponse.json(
      {
        success: true,
        leadId: lead?.id,
        message: "Thank you! We'll be in touch soon.",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Lead capture error", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/widget/leads?siteId=xxx
 *
 * Get leads for a site (requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // This endpoint requires the user to own the site
    // For now, we'll use service role but in production
    // this should verify the authenticated user owns the site
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: leads, error } = await serviceSupabase
      .from("site_leads")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("Failed to fetch leads", error, { siteId });
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ leads }, { headers: corsHeaders });
  } catch (error) {
    logger.error("Leads fetch error", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500, headers: corsHeaders }
    );
  }
}
