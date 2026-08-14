import { NextResponse } from "next/server";
import { getTalentResume, removeTalentResume, uploadTalentResume } from "@/lib/profile-resume";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

export async function GET(request: Request) {
  const result = await getTalentResume(bearerToken(request));
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 403 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Choose a resume file." }, { status: 422 });
  }

  const result = await uploadTalentResume(bearerToken(request), file);
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 422 });
}

export async function DELETE(request: Request) {
  const result = await removeTalentResume(bearerToken(request));
  return NextResponse.json(result, { status: result.ok ? 200 : result.message === "Sign in required." ? 401 : 403 });
}