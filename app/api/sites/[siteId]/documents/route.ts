import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as documentService from "@/lib/services/document-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireUser();
    const { siteId } = await params;

    const documents = await documentService.getDocumentsForSite(siteId);

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
