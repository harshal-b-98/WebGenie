import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { KnowledgeBaseClient } from "@/components/features/knowledge-base/knowledge-base-client";

interface KnowledgeBasePageProps {
  params: Promise<{ siteId: string }>;
}

async function getSiteWithKnowledgeBase(siteId: string, userId: string) {
  const supabase = await createClient();

  // Get site details
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  if (siteError || !site) {
    return null;
  }

  // Get all documents for this site
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  // Get all embeddings/chunks
  const { data: chunks } = await supabase
    .from("document_embeddings")
    .select("*")
    .eq("project_id", siteId)
    .order("created_at", { ascending: false });

  // Calculate statistics
  const stats = {
    totalChunks: chunks?.length || 0,
    totalDocuments: documents?.length || 0,
    byType: {} as Record<string, number>,
    byDocument: {} as Record<string, number>,
    documentsWithEmbeddings: 0,
    documentsWithoutEmbeddings: 0,
  };

  if (chunks) {
    chunks.forEach((chunk: { chunk_type: string; document_id: string }) => {
      // Count by type
      const type = chunk.chunk_type || "unknown";
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by document
      stats.byDocument[chunk.document_id] = (stats.byDocument[chunk.document_id] || 0) + 1;
    });
  }

  // Count documents with/without embeddings
  if (documents) {
    documents.forEach((doc: { id: string }) => {
      if (stats.byDocument[doc.id]) {
        stats.documentsWithEmbeddings++;
      } else {
        stats.documentsWithoutEmbeddings++;
      }
    });
  }

  return {
    site,
    documents: documents || [],
    chunks: chunks || [],
    stats,
  };
}

export default async function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  const user = await requireUser();
  const { siteId } = await params;
  const data = await getSiteWithKnowledgeBase(siteId, user.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/sites/${siteId}`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Project
            </Link>
            <h1 className="text-xl font-bold">Knowledge Base</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Pass data to client component */}
        <KnowledgeBaseClient
          siteId={siteId}
          initialData={{
            site: data.site,
            documents: data.documents,
            chunks: data.chunks,
            stats: data.stats,
          }}
        />
      </main>
    </div>
  );
}
