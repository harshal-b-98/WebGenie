import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import * as workspaceService from "@/lib/services/workspace-service";
import { updateWorkspaceSchema } from "@/lib/validation/workspace";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const workspace = await workspaceService.getWorkspace(id, user.id);

    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateWorkspaceSchema.parse(body);
    const workspace = await workspaceService.updateWorkspace(id, user.id, validatedData);

    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await workspaceService.deleteWorkspace(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 400 });
  }
}
