// Test endpoint for semantic search validation
// This endpoint helps verify embeddings and search are working correctly

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as semanticSearchService from "@/lib/services/semantic-search-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { projectId, query, chunkTypes, limit, threshold } = await request.json();

    if (!projectId || !query) {
      return NextResponse.json(
        { error: { message: "projectId and query are required" } },
        { status: 400 }
      );
    }

    // Perform semantic search
    const results = await semanticSearchService.semanticSearch(projectId, query, {
      chunkTypes,
      limit: limit || 5,
      threshold: threshold || 0.7,
    });

    // Return results with debugging info
    return NextResponse.json({
      query,
      projectId,
      resultsFound: results.length,
      results: results.map((r) => ({
        chunkText: r.chunkText.substring(0, 200) + "...", // Truncate for readability
        chunkType: r.chunkType,
        similarity: r.similarity.toFixed(3),
        keywords: r.keywords.slice(0, 5),
      })),
      fullResults: results, // Full results for detailed analysis
    });
  } catch (error) {
    console.error("Search test failed:", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    message: "Semantic Search Test Endpoint",
    usage: "POST with { projectId, query, chunkTypes?, limit?, threshold? }",
    example: {
      projectId: "your-project-id",
      query: "What features does BevGenie offer?",
      chunkTypes: ["feature", "benefit"],
      limit: 5,
      threshold: 0.7,
    },
  });
}
