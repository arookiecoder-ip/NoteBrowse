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
                <div className="nb-feature" style={{ border: "none", padding: "16px 0", background: "transparent" }}>
                  <div className="nb-feature__icon">🔑</div>
                  <div className="nb-feature__title">Password protected</div>
                  <div className="nb-feature__desc">Only people with the correct password can read or edit content.</div>
                </div>
                <hr className="nb-divider" />
                <div className="nb-feature" style={{ border: "none", padding: "16px 0", background: "transparent" }}>
                  <div className="nb-feature__icon">🛡️</div>
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