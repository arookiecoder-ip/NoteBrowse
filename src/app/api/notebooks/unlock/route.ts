import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { signSessionCookie, issueCsrfToken, getClientIp, SESSION_COOKIE, CSRF_COOKIE, IDLE_TIMEOUT_MS } from "@/lib/auth";
import { rateLimitAssert, rateLimitFail, rateLimitReset, RateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!slug || !password) {
    return NextResponse.json({ error: "Slug and password are required." }, { status: 400 });
  }

  const ip = getClientIp(request);

  // Rate limit check
  try {
    rateLimitAssert(ip, slug);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many unlock attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({ where: { slug } });

  if (!notebook) {
    rateLimitFail(ip, slug);
    return NextResponse.json({ error: "Invalid notebook link or password." }, { status: 401 });
  }

  const passwordValid = await verifyPassword(password, notebook.passwordHash);
  if (!passwordValid) {
    rateLimitFail(ip, slug);
    return NextResponse.json({ error: "Invalid notebook link or password." }, { status: 401 });
  }

  rateLimitReset(ip, slug);

  const expiresAt = Date.now() + IDLE_TIMEOUT_MS;
  const sessionCookie = signSessionCookie({ slug, expiresAt });
  const csrfToken = issueCsrfToken();

  const response = NextResponse.json(
    { unlocked: true, notebookLink: `/editor/${slug}` },
    { status: 200 },
  );

  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });

  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });

  return response;
}