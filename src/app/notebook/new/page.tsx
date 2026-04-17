import { CreateForm } from "@/components/create-form";

export default function NewNotebookPage() {
  return (
    <main className="nb-bg">
      <div className="nb-page" style={{ paddingTop: 96 }}>
        <div className="nb-grid-split">
          <div>
            <div className="nb-page-header">
              <span className="nb-badge">✦ Secure</span>
              <h1 className="nb-page-header__title" style={{ marginTop: 16 }}>Create a private notebook</h1>
              <p className="nb-page-header__desc">
                Choose a custom slug or let NoteBrowse generate a high-entropy link. Your notebook content is encrypted before it touches the database.
              </p>
            </div>
            <div className="nb-card" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="nb-feature" style={{ border: "none", padding: "16px 0 16px 16px", background: "transparent" }}>
                  <div className="nb-feature__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                  </div>
                  <div className="nb-feature__title">Password protected</div>
                  <div className="nb-feature__desc">Only people with the correct password can read or edit content.</div>
                </div>
                <hr className="nb-divider" />
                <div className="nb-feature" style={{ border: "none", padding: "16px 0 16px 16px", background: "transparent" }}>
                  <div className="nb-feature__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="nb-feature__title">Encrypted at rest</div>
                  <div className="nb-feature__desc">AES encryption ensures your data stays private even in the database.</div>
                </div>
              </div>
            </div>
          </div>
          <div className="nb-card">
            <CreateForm />
          </div>
        </div>
      </div>
    </main>
  );
}