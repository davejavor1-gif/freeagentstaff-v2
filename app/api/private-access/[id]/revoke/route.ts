import { NextResponse } from "next/server";
import { revokePrivateAccess } from "@/lib/private-access";

function token(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await revokePrivateAccess(token(request), id);
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 403 });
}
