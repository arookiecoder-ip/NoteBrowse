import { randomBytes } from "node:crypto";
import { hmacSign, hmacVerify } from "./crypto";

// ── Session cookies (stateless, HMAC-signed) ────────────────────────

export const SESSION_COOKIE = "nb_session";
export const CSRF_COOKIE = "nb_csrf";
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface SessionPayload {
  slug: string;
  expiresAt: number;
}

export function signSessionCookie(payload: SessionPayload): string {
  const data = `${payload.slug}:${payload.expiresAt}`;
  const sig = hmacSign(data);
  return `${data}:${sig}`;
}

export function verifySessionCookie(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;

  const parts = raw.split(":");
  if (parts.length !== 3) return null;

  const [slug, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);

  if (!slug || Number.isNaN(expiresAt)) return null;

  const data = `${slug}:${expiresAtStr}`;
  if (!hmacVerify(data, sig)) return null;

  if (expiresAt <= Date.now()) return null;

  return { slug, expiresAt };
}

// ── CSRF tokens ─────────────────────────────────────────────────────

export function issueCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(token: string | null, expected: string | null): boolean {
  if (!token || !expected || token.length !== expected.length) return false;

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// ── Client IP ───────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  }
  return "unknown";
}
