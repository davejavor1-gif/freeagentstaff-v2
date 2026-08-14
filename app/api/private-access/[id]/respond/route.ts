import { NextResponse } from "next/server";
import { respondPrivateAccess } from "@/lib/private-access";

function token(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: "accepted" | "declined" } | null;
  const result = await respondPrivateAccess(token(request), id, body?.status === "accepted" ? "accepted" : "declined");
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 403 });
}
