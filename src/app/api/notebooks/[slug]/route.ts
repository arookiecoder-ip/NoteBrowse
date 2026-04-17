import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { decrypt, encrypt, hashPassword, verifyPassword } from "@/lib/crypto";
import { verifySessionCookie, SESSION_COOKIE } from "@/lib/auth";
import { createHash } from "node:crypto";

async function getSession(slug: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionCookie(raw);

  if (!session || session.slug !== slug) {
    return null;
  }
  return session;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip || "unknown").digest("hex");
}

function getIp(request: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim() || "unknown";
  }
  return "unknown";
}

// ── GET: read notebook content ──────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession(slug);
  if (!session) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({ where: { slug } });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const ip = getIp(request);
  await prisma.auditLog.create({
    data: {
      eventType: "notebook_viewed",
      notebookId: notebook.id,
      sessionId: `signed:${slug}`,
      ipHash: hashIp(ip),
    },
  });

  const content = decrypt({
    ciphertext: notebook.contentCiphertext,
    nonce: notebook.contentNonce,
    keyVersion: notebook.contentKeyVersion,
  });

  return NextResponse.json({ slug, content, updatedAt: notebook.updatedAt.toISOString() });
}

// ── PATCH: update notebook content ──────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession(slug);
  if (!session) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;
  const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : undefined;

  if (content === undefined && password === undefined) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({ where: { slug } });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const dataToUpdate: any = {};

  if (content !== undefined) {
    const encrypted = encrypt(content);
    dataToUpdate.contentCiphertext = encrypted.ciphertext;
    dataToUpdate.contentNonce = encrypted.nonce;
    dataToUpdate.contentKeyVersion = encrypted.keyVersion;
  }

  if (password !== undefined) {
    if (!oldPassword) {
      return NextResponse.json({ error: "Old password is required to set a new password." }, { status: 400 });
    }
    const isValid = await verifyPassword(oldPassword, notebook.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect old password." }, { status: 403 });
    }

    if (password.trim() === "") {
      return NextResponse.json({ error: "New password cannot be empty." }, { status: 400 });
    }
    dataToUpdate.passwordHash = await hashPassword(password);
  }

  await prisma.notebook.update({
    where: { slug },
    data: dataToUpdate,
  });

  const ip = getIp(request);
  await prisma.auditLog.create({
    data: {
      eventType: "notebook_edited",
      notebookId: notebook.id,
      sessionId: `signed:${slug}`,
      ipHash: hashIp(ip),
    },
  });

  return NextResponse.json({ saved: true, updatedAt: new Date().toISOString() });
}

// ── DELETE: permanently delete notebook ─────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const session = await getSession(slug);
  if (!session) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.confirmDelete !== true) {
    return NextResponse.json({ error: "Delete confirmation required." }, { status: 400 });
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({ where: { slug } });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const ip = getIp(request);
  await prisma.auditLog.create({
    data: {
      eventType: "notebook_deleted",
      notebookId: notebook.id,
      sessionId: `signed:${slug}`,
      ipHash: hashIp(ip),
    },
  });

  await prisma.notebook.delete({ where: { slug } });

  const response = NextResponse.json({ deleted: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
