import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { decrypt, encrypt, hashPassword, verifyPassword } from "@/lib/crypto";
import { verifySessionCookie, signSessionCookie, SESSION_COOKIE, CSRF_COOKIE, IDLE_TIMEOUT_MS } from "@/lib/auth";
import { createHash } from "node:crypto";

function refreshCookies(response: NextResponse, slug: string, csrfToken: string | undefined) {
  const expiresAt = Date.now() + IDLE_TIMEOUT_MS;
  response.cookies.set(SESSION_COOKIE, signSessionCookie({ slug, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });

  if (csrfToken) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(expiresAt),
    });
  }
}

async function getSessionContext(slug: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const csrfToken = cookieStore.get(CSRF_COOKIE)?.value;
  const session = verifySessionCookie(raw);

  if (!session || session.slug !== slug) {
    return null;
  }
  return { session, csrfToken };
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

// ── GET: read notebook with all pages ───────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const context = await getSessionContext(slug);
  if (!context) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let prisma;
  try {
    prisma = await getPrisma();
  } catch {
    return NextResponse.json({ error: "Service unavailable. Please try again later." }, { status: 503 });
  }

  let notebook;
  try {
    notebook = await prisma.notebook.findUnique({
      where: { slug },
      include: { pages: { orderBy: { order: "asc" } } },
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable. Please try again later." }, { status: 503 });
  }

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const ip = getIp(request);
  try {
    await prisma.auditLog.create({
      data: {
        eventType: "notebook_viewed",
        notebookId: notebook.id,
        sessionId: `signed:${slug}`,
        ipHash: hashIp(ip),
      },
    });
  } catch {
    // Non-fatal: audit log failure should not block notebook access
  }

  const pages = notebook.pages.map((page) => {
    let content = "";
    let warning: string | undefined;
    try {
      content = decrypt({
        ciphertext: page.contentCiphertext,
        nonce: page.contentNonce,
        keyVersion: page.contentKeyVersion,
      });
    } catch (err) {
      warning = `Page "${page.title}" could not be decrypted: ${(err as Error).message}`;
    }
    return { id: page.id, title: page.title, order: page.order, content, warning };
  });

  const response = NextResponse.json({
    slug,
    pages,
    updatedAt: notebook.updatedAt.toISOString(),
  });
  refreshCookies(response, slug, context.csrfToken);
  return response;
}

// ── PATCH: update notebook (content/password) or a specific page ────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const context = await getSessionContext(slug);
  if (!context) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({
    where: { slug },
    include: { pages: { orderBy: { order: "asc" } } },
  });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  // ── Password change ──
  const password = typeof body.password === "string" ? body.password : undefined;
  const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : undefined;

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
    await prisma.notebook.update({
      where: { slug },
      data: { passwordHash: await hashPassword(password) },
    });
    const response = NextResponse.json({ saved: true });
    refreshCookies(response, slug, context.csrfToken);
    return response;
  }

  // ── Page content update ──
  const pageId = typeof body.pageId === "string" ? body.pageId : undefined;
  const content = typeof body.content === "string" ? body.content : undefined;
  const title = typeof body.title === "string" ? body.title : undefined;

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required." }, { status: 400 });
  }

  const page = notebook.pages.find((p) => p.id === pageId);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const dataToUpdate: Record<string, unknown> = {};

  if (content !== undefined) {
    const encrypted = encrypt(content);
    dataToUpdate.contentCiphertext = encrypted.ciphertext;
    dataToUpdate.contentNonce = encrypted.nonce;
    dataToUpdate.contentKeyVersion = encrypted.keyVersion;
  }

  if (title !== undefined) {
    if (title.trim() === "") {
      return NextResponse.json({ error: "Page title cannot be empty." }, { status: 400 });
    }
    dataToUpdate.title = title.trim();
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  await prisma.page.update({ where: { id: pageId }, data: dataToUpdate });

  const ip = getIp(request);
  await prisma.auditLog.create({
    data: {
      eventType: "notebook_edited",
      notebookId: notebook.id,
      sessionId: `signed:${slug}`,
      ipHash: hashIp(ip),
    },
  });

  const response = NextResponse.json({ saved: true, updatedAt: new Date().toISOString() });
  refreshCookies(response, slug, context.csrfToken);
  return response;
}

// ── DELETE: delete notebook or a specific page ───────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const context = await getSessionContext(slug);
  if (!context) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({
    where: { slug },
    include: { pages: true },
  });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const ip = getIp(request);

  // ── Delete a single page ──
  const pageId = typeof body.pageId === "string" ? body.pageId : undefined;
  if (pageId) {
    if (notebook.pages.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last page. Delete the notebook instead." }, { status: 400 });
    }
    const page = notebook.pages.find((p) => p.id === pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }
    await prisma.page.delete({ where: { id: pageId } });
    // Re-order remaining pages
    const remaining = notebook.pages.filter((p) => p.id !== pageId).sort((a, b) => a.order - b.order);
    await Promise.all(remaining.map((p, i) => prisma.page.update({ where: { id: p.id }, data: { order: i } })));

    const response = NextResponse.json({ deleted: true });
    refreshCookies(response, slug, context.csrfToken);
    return response;
  }

  // ── Delete entire notebook ──
  if (body.confirmDelete !== true) {
    return NextResponse.json({ error: "Delete confirmation required." }, { status: 400 });
  }

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
