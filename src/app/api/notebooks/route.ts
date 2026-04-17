import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { encrypt, hashPassword } from "@/lib/crypto";
import { rateLimitCreateAssert, rateLimitCreateRecord, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/auth";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const mode = body.mode === "random" ? "random" : "custom";
  const password = typeof body.password === "string" ? body.password : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const ip = getClientIp(request);

  try {
    rateLimitCreateAssert(ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many notebooks created. Try again later." },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }

  const prisma = await getPrisma();
  let slug: string;

  if (mode === "custom") {
    slug = normalizeSlug(typeof body.slug === "string" ? body.slug : "");

    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be 3-64 lowercase letters, numbers, or hyphens." },
        { status: 400 },
      );
    }

    const existing = await prisma.notebook.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
  } else {
    slug = randomBytes(8).toString("base64url");
  }

  const encrypted = encrypt(content);
  const pwHash = await hashPassword(password);

  await prisma.notebook.create({
    data: {
      slug,
      mode,
      passwordHash: pwHash,
      contentCiphertext: encrypted.ciphertext,
      contentNonce: encrypted.nonce,
      contentKeyVersion: encrypted.keyVersion,
    },
  });

  rateLimitCreateRecord(ip);

  return NextResponse.json(
    { slug, privateLink: `/notebook/${slug}` },
    { status: 201 },
  );
}
