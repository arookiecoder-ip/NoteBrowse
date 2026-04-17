export default function HomePage() {
  return (
    <main className="nb-bg">
      <div className="nb-page">
        <section className="nb-hero">
          <div className="nb-hero__icon">🔒</div>
          <h1 className="nb-hero__title">
            Your notes, protected by design.
          </h1>
          <p className="nb-hero__subtitle">
            Create encrypted notebooks secured behind private links and passwords. No accounts, no tracking — just write.
          </p>
          <div className="nb-hero__actions">
            <a href="/notebook/new" className="nb-btn nb-btn--primary nb-btn--lg">
              Create Notebook
            </a>
            <a href="/notebook/unlock" className="nb-btn nb-btn--secondary nb-btn--lg">
              Unlock Notebook
            </a>
          </div>
        </section>

        <div className="nb-features">
          <div className="nb-feature">
            <div className="nb-feature__icon">🔐</div>
            <div className="nb-feature__title">End-to-end encrypted</div>
            <div className="nb-feature__desc">
              Content is encrypted before storage. Only you hold the key.
            </div>
          </div>
          <div className="nb-feature">
            <div className="nb-feature__icon">🔗</div>
            <div className="nb-feature__title">Private link access</div>
            <div className="nb-feature__desc">
              Share via unique links. Custom slugs or auto-generated secure URLs.
            </div>
          </div>
          <div className="nb-feature">
            <div className="nb-feature__icon">🚫</div>
            <div className="nb-feature__title">No account required</div>
            <div className="nb-feature__desc">
              No sign-ups, no emails. Just create, write, and lock.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
