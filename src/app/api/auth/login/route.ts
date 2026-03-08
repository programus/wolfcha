import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.json(
      { error: "Server not configured: missing SITE_PASSWORD" },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json() as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.password !== sitePassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Token = SHA-256(SITE_PASSWORD) — changing the password automatically invalidates all cookies
  const token = createHash("sha256").update(sitePassword).digest("hex");

  const response = NextResponse.json({ ok: true });
  response.cookies.set("wolfcha_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // 30-year expiry — effectively permanent
    maxAge: 60 * 60 * 24 * 365 * 30,
    path: "/",
  });
  return response;
}
