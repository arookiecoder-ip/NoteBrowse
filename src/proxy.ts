import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "nb_session";
const CSRF_COOKIE = "nb_csrf";

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function withHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// ── HMAC via Web Crypto (Edge-compatible) ──

function getKeyBytes(): Uint8Array {
  const raw = process.env.NOTEBOOK_ENCRYPTION_KEY;
  if (!raw) throw new Error("NOTEBOOK_ENCRYPTION_KEY is not set");
  const str = atob(raw);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getKeyBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToHex(new Uint8Array(sig));
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    getKeyBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = hexToBytes(signature);
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
}

async function verifySessionCookie(raw: string | undefined): Promise<{ slug: string; expiresAt: number } | null> {
  if (!raw) return null;

  const parts = raw.split(":");
  if (parts.length !== 3) return null;

  const [slug, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!slug || Number.isNaN(expiresAt)) return null;

  const data = `${slug}:${expiresAtStr}`;
  if (!await hmacVerify(data, sig)) return null;
  if (expiresAt <= Date.now()) return null;

  return { slug, expiresAt };
}

function verifyCsrfToken(token: string | null, expected: string | null): boolean {
  if (!token || !expected || token.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return result === 0;
}

// ── Proxy ──

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // CSRF check on mutating notebook API calls (skip create & unlock — no session yet)
  if (pathname.startsWith("/api/notebooks/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    if (pathname !== "/api/notebooks" && pathname !== "/api/notebooks/unlock") {
      const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value ?? null;
      const csrfHeader = request.headers.get("x-csrf-token");

      if (!verifyCsrfToken(csrfHeader, csrfCookie)) {
        return withHeaders(NextResponse.json({ error: "CSRF validation failed." }, { status: 403 }));
      }
    }
  }

  // NOTE: Session guard for /editor/* pages is now handled server-side
  // in src/app/editor/[slug]/page.tsx, which checks notebook existence
  // and session validity to show the appropriate UI (editor, password
  // form, or "not found").

  return withHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/", "/notebook/:path*", "/editor/:path*", "/api/notebooks/:path*"],
};
