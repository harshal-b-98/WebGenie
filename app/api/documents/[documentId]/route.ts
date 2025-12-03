import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as documentService from "@/lib/services/document-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await requireUser();
    const { documentId } = await params;

    await documentService.deleteDocument(documentId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
