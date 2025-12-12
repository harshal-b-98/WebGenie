import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as generationService from "@/lib/services/generation-service";
import { formatErrorResponse } from "@/lib/utils/errors";
import { generateRequestSchema, validateBody } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Validate request body
    const validation = await validateBody(request, generateRequestSchema);
    if (validation.error) return validation.error;
    const { siteId, conversationId } = validation.data;

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
