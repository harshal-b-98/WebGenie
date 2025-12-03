import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as generationService from "@/lib/services/generation-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { siteId, conversationId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: { message: "siteId is required" } }, { status: 400 });
    }

    // Generate website
    const result = await generationService.generateWebsite({
      siteId,
      userId: user.id,
      conversationId,
    });

    return NextResponse.json({
      success: true,
      versionId: result.versionId,
      generationTime: result.generationTime,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
