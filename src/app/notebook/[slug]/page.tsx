import { notFound } from "next/navigation";
import { SlugUnlock } from "@/components/slug-unlock";
import { getPrisma } from "@/lib/prisma";

export default async function NotebookBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Check if notebook exists before showing the unlock form
  const prisma = await getPrisma();
  const notebook = await prisma.notebook.findUnique({
    where: { slug },
    select: { slug: true },
  });

  if (!notebook) {
    notFound();
  }

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
