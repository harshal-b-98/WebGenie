import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import * as documentService from "@/lib/services/document-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireUser();
    const { siteId } = await params;

    const documents = await documentService.getDocumentsForSite(siteId);

    // Batch fetch embedding counts in a single query
    const supabase = await createClient();
    const documentIds = documents.map((d) => d.id);

    const { data: embeddingCounts } = await supabase
      .from("document_embeddings")
      .select("document_id")
      .in("document_id", documentIds.length > 0 ? documentIds : ["__none__"]);

    // Count embeddings per document
    const countMap: Record<string, number> = {};
    (embeddingCounts as { document_id: string }[] | null)?.forEach((row) => {
      const docId = row.document_id;
      countMap[docId] = (countMap[docId] || 0) + 1;
    });

    // Merge counts into documents
    const documentsWithCounts = documents.map((doc) => ({
      ...doc,
      embedding_count: countMap[doc.id] || 0,
    }));

    return NextResponse.json({ documents: documentsWithCounts });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
