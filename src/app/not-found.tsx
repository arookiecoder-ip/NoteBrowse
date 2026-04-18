import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nb-bg">
      <div className="nb-page nb-page--narrow" style={{ paddingTop: 96 }}>
        <div className="nb-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: "var(--text-muted)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="nb-heading-lg" style={{ marginBottom: 8 }}>Notebook not found</h1>
          <p className="nb-text" style={{ marginBottom: 28 }}>
            This notebook doesn&apos;t exist or may have been deleted.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/new" className="nb-btn nb-btn--primary">Create Notebook</Link>
            <Link href="/unlock" className="nb-btn nb-btn--secondary">Unlock Existing</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
