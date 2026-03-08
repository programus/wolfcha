import { NextRequest, NextResponse } from "next/server";

const LOCALE_COOKIE = "wolfcha.locale";
const AUTH_COOKIE = "wolfcha_auth";

/**
 * Compute the expected auth token (SHA-256 of SITE_PASSWORD via Web Crypto).
 * Stateless: changing SITE_PASSWORD automatically invalidates all cookies.
 */
async function computeExpectedToken(): Promise<string> {
  const pw = process.env.SITE_PASSWORD ?? "";
  const encoded = new TextEncoder().encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass: static assets, Next.js internals, API routes, login page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  const authCookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expectedToken = await computeExpectedToken();
  if (!authCookie || authCookie !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // ── Locale detection (unchanged logic) ──────────────────────────────────────
  if (pathname.startsWith("/zh")) {
    return NextResponse.next();
  }

  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (savedLocale === "zh") {
    const url = new URL(pathname === "/" ? "/zh" : `/zh${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  if (savedLocale === "en") {
    return NextResponse.next();
  }

  const acceptLanguage = request.headers.get("accept-language") || "";
  const prefersChinese = acceptLanguage
    .split(",")
    .some((lang) => lang.trim().toLowerCase().startsWith("zh"));

  if (prefersChinese) {
    const url = new URL(pathname === "/" ? "/zh" : `/zh${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
