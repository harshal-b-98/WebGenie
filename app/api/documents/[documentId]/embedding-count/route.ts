// API endpoint to get embedding count for a document

import { NextResponse } from "next/server";
import * as embeddingService from "@/lib/services/embedding-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const count = await embeddingService.getEmbeddingCount(documentId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to get embedding count:", error);
    return NextResponse.json({ count: 0 });
  }
}
