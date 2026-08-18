import { NextResponse } from "next/server";
import { loadPrivateAccess } from "@/lib/private-access";

function token(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await loadPrivateAccess(token(request), slug);
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 403 });
}
