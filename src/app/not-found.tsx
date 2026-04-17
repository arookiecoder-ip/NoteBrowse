import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nb-bg">
      <div className="nb-page nb-page--narrow" style={{ paddingTop: 96 }}>
        <div className="nb-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📒</div>
          <h1 className="nb-heading-lg" style={{ marginBottom: 8 }}>Notebook not found</h1>
          <p className="nb-text" style={{ marginBottom: 28 }}>
            This notebook doesn&apos;t exist or may have been deleted.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/notebook/new" className="nb-btn nb-btn--primary">Create Notebook</Link>
            <Link href="/notebook/unlock" className="nb-btn nb-btn--secondary">Unlock Existing</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
