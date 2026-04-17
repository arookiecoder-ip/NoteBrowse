import { Editor } from "@/components/editor";

export default function EditorPage({ params }: { params: Promise<{ slug: string }> }) {
  return <EditorPageInner paramsPromise={params} />;
}

async function EditorPageInner({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;

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
