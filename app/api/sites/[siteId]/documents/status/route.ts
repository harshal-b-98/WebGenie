import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

interface DocumentStatus {
  id: string;
  filename: string;
  processing_status: string;
  file_size: number;
  created_at: string;
}

interface StatusResponse {
  totalDocuments: number;
  isReady: boolean;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  documents: DocumentStatus[];
}

/**
 * GET /api/sites/[siteId]/documents/status
 * Get the processing status of all documents for a site
 * Used by the generate page to wait for document processing to complete
 */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    const supabase = await createClient();

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    // Get all documents for the site
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, filename, processing_status, file_size, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    if (docsError) {
      logger.error("Failed to fetch document status", docsError, { siteId });
      throw docsError;
    }

    const docs = (documents || []) as DocumentStatus[];

    // Calculate counts
    const pendingCount = docs.filter((d) => d.processing_status === "pending").length;
    const processingCount = docs.filter((d) => d.processing_status === "processing").length;
    const completedCount = docs.filter((d) => d.processing_status === "completed").length;
    const failedCount = docs.filter((d) => d.processing_status === "failed").length;

    // Ready when no documents are pending or processing
    const isReady = pendingCount === 0 && processingCount === 0;

    const response: StatusResponse = {
      totalDocuments: docs.length,
      isReady,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      documents: docs,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Document status check failed", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
