import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { verifySessionCookie, SESSION_COOKIE } from "@/lib/auth";
import { Editor } from "@/components/editor";
import { SlugUnlock } from "@/components/slug-unlock";

export default function EditorPage({ params }: { params: Promise<{ slug: string }> }) {
  return <EditorPageInner paramsPromise={params} />;
}

async function EditorPageInner({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;

  // 1. Check if the notebook exists in the database
  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({
    where: { slug },
    select: { slug: true },
  });

  // 2. Notebook does NOT exist → show "not found" with link to create
  if (!notebook) {
    return (
      <main className="nb-bg">
        <div className="nb-page nb-page--narrow" style={{ paddingTop: 96 }}>
          <div className="nb-card">
            <div className="nb-page-header">
              <h1 className="nb-page-header__title">Notebook Not Found</h1>
              <p className="nb-page-header__desc">
                No notebook exists with the URL &ldquo;{slug}&rdquo;.
              </p>
            </div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <a href="/notebook/new" className="nb-btn nb-btn--primary nb-btn--full" style={{ textAlign: "center" }}>
                Create a New Notebook
              </a>
              <a href="/notebook/unlock" className="nb-btn nb-btn--secondary nb-btn--full" style={{ textAlign: "center" }}>
                Unlock an Existing Notebook
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Notebook exists → check if user has a valid session for this slug
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionCookie(raw);

  // 4. No valid session → show password entry form
  if (!session || session.slug !== slug) {
    return (
      <main className="nb-bg">
        <div className="nb-page nb-page--narrow" style={{ paddingTop: 96 }}>
          <div className="nb-card">
            <div className="nb-page-header">
              <h1 className="nb-page-header__title">Unlock &ldquo;{slug}&rdquo;</h1>
              <p className="nb-page-header__desc">Enter your password to access this notebook.</p>
            </div>
            <SlugUnlock slug={slug} />
          </div>
        </div>
      </main>
    );
  }

  // 5. Valid session → show the editor
  return (
    <main className="nb-bg">
      <div className="nb-page nb-page--medium" style={{ paddingTop: 96 }}>
        <div className="nb-card">
          <div className="nb-page-header">
            <h1 className="nb-page-header__title">Notebook Editor</h1>
            <p className="nb-page-header__desc">Edit your encrypted notebook. Changes are saved server-side.</p>
          </div>
          <Editor slug={slug} />
        </div>
      </div>
    </main>
  );
}
