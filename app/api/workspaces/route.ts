import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as workspaceService from "@/lib/services/workspace-service";
import { createWorkspaceSchema } from "@/lib/validation/workspace";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET() {
  try {
    const user = await requireUser();
    const workspaces = await workspaceService.getUserWorkspaces(user.id);

    return NextResponse.json({ workspaces });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const validatedData = createWorkspaceSchema.parse(body);
    const workspace = await workspaceService.createWorkspace(user.id, validatedData);

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    const errorResponse = formatErrorResponse(error);
    const statusCode = errorResponse.error.statusCode || 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
