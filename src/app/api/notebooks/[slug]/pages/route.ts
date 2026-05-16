import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { verifySessionCookie, SESSION_COOKIE, CSRF_COOKIE, signSessionCookie, IDLE_TIMEOUT_MS } from "@/lib/auth";

async function getSessionContext(slug: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const csrfToken = cookieStore.get(CSRF_COOKIE)?.value;
  const session = verifySessionCookie(raw);
  if (!session || session.slug !== slug) return null;
  return { session, csrfToken };
}

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

// ── POST: add a new page to a notebook ──────────────────────────────

export async function POST(
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

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Untitled";

  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({
    where: { slug },
    include: { pages: { orderBy: { order: "desc" }, take: 1 } },
  });
  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  }

  const nextOrder = notebook.pages.length > 0 ? notebook.pages[0].order + 1 : 0;
  const encrypted = encrypt("");

  const page = await prisma.page.create({
    data: {
      notebookId: notebook.id,
      title,
      order: nextOrder,
      contentCiphertext: encrypted.ciphertext,
      contentNonce: encrypted.nonce,
      contentKeyVersion: encrypted.keyVersion,
    },
  });

  const response = NextResponse.json({ id: page.id, title: page.title, order: page.order, content: "" }, { status: 201 });
  refreshCookies(response, slug, context.csrfToken);
  return response;
}
