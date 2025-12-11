"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface KnowledgeBaseClientProps {
  siteId: string;
  initialData: {
    site: {
      id: string;
      title: string;
    };
    documents: Array<{
      id: string;
      filename: string;
      file_size: number;
      created_at: string;
      processing_status: string;
    }>;
    chunks: Array<{
      id: string;
      document_id: string;
      chunk_text: string;
      chunk_index: number;
      chunk_type: string | null;
      keywords: string[];
      created_at: string;
    }>;
    stats: {
      totalChunks: number;
      totalDocuments: number;
      byType: Record<string, number>;
      byDocument: Record<string, number>;
      documentsWithEmbeddings: number;
      documentsWithoutEmbeddings: number;
    };
  };
}

export function KnowledgeBaseClient({ siteId, initialData }: KnowledgeBaseClientProps) {
  const [filter, setFilter] = useState<{
    documentId?: string;
    chunkType?: string;
    search?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | {
        chunkText: string;
        chunkType: string;
        similarity: string;
        keywords: string[];
      }[]
    | null
  >(null);
  const [searching, setSearching] = useState(false);

  // Filter chunks based on current filters
  const filteredChunks = initialData.chunks.filter((chunk) => {
    if (filter.documentId && chunk.document_id !== filter.documentId) return false;
    if (filter.chunkType && chunk.chunk_type !== filter.chunkType) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        chunk.chunk_text.toLowerCase().includes(searchLower) ||
        chunk.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // Test semantic search
  const handleTestSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/test/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: siteId,
          query: searchQuery,
          limit: 5,
          threshold: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results);
      toast.success(`Found ${data.resultsFound} relevant chunks`);
    } catch (error) {
      toast.error("Search test failed");
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const getChunkTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      feature: "bg-blue-100 text-blue-800",
      benefit: "bg-green-100 text-green-800",
      pricing: "bg-purple-100 text-purple-800",
      use_case: "bg-yellow-100 text-yellow-800",
      technical: "bg-gray-100 text-gray-800",
      testimonial: "bg-pink-100 text-pink-800",
      general: "bg-gray-50 text-gray-600",
    };
    return colors[type || "general"] || colors.general;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total Chunks</div>
          <div className="mt-2 text-3xl font-bold">{initialData.stats.totalChunks}</div>
          <div className="mt-1 text-xs text-gray-500">
            From {initialData.stats.totalDocuments} documents
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600">Embedding Coverage</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {initialData.stats.documentsWithEmbeddings}/{initialData.stats.totalDocuments}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {initialData.stats.documentsWithoutEmbeddings > 0
              ? `${initialData.stats.documentsWithoutEmbeddings} need processing`
              : "All documents processed"}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600">Chunk Types</div>
          <div className="mt-2 text-3xl font-bold">
            {Object.keys(initialData.stats.byType).length}
          </div>
          <div className="mt-1 text-xs text-gray-500">Different content types</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600">Search Ready</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {initialData.stats.totalChunks > 0 ? "✓" : "✗"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {initialData.stats.totalChunks > 0
              ? "AI can answer questions"
              : "Upload documents first"}
          </div>
        </Card>
      </div>

      {/* Type Distribution */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Content Type Distribution</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(initialData.stats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <button
                key={type}
                onClick={() =>
                  setFilter((prev) => ({
                    ...prev,
                    chunkType: prev.chunkType === type ? undefined : type,
                  }))
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter.chunkType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type}: {count}
              </button>
            ))}
        </div>
      </Card>

      {/* Live Search Tester */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Test Semantic Search</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question... (e.g., 'What features does BevGenie offer?')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTestSearch()}
              className="flex-1"
            />
            <Button onClick={handleTestSearch} disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchResults && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Search Results (by relevance):
              </div>
              {searchResults.map((result, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className={getChunkTypeColor(result.chunkType)}>
                      {result.chunkType || "general"}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Similarity: {(parseFloat(result.similarity) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{result.chunkText}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Filter by Document</label>
          <select
            value={filter.documentId || ""}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                documentId: e.target.value || undefined,
              }))
            }
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Documents</option>
            {initialData.documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename} ({initialData.stats.byDocument[doc.id] || 0} chunks)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Search Text</label>
          <Input
            placeholder="Search chunks..."
            value={filter.search || ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, search: e.target.value || undefined }))
            }
            className="w-64"
          />
        </div>

        {(filter.documentId || filter.chunkType || filter.search) && (
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setFilter({})}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Chunk List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Document Chunks ({filteredChunks.length})</h2>
        </div>

        {filteredChunks.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">
              {initialData.chunks.length === 0
                ? "No chunks yet. Upload documents to build your knowledge base."
                : "No chunks match your filters."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredChunks.map((chunk) => {
              const document = initialData.documents.find((d) => d.id === chunk.document_id);

              return (
                <Card key={chunk.id} className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getChunkTypeColor(chunk.chunk_type)}>
                        {chunk.chunk_type || "general"}
                      </Badge>
                      <span className="text-xs text-gray-500">Chunk #{chunk.chunk_index + 1}</span>
                      {document && (
                        <span className="text-xs text-gray-400">from {document.filename}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(chunk.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="mb-3 text-sm text-gray-700 leading-relaxed">{chunk.chunk_text}</p>

                  {chunk.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500">Keywords:</span>
                      {chunk.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
