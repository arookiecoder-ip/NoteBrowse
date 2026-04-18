export default function HomePage() {
  return (
    <main className="nb-bg">
      <div className="nb-page">
        <section className="nb-hero">
          <div className="nb-hero__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="nb-hero__title">
            Your notes, <span>protected by design.</span>
          </h1>
          <p className="nb-hero__subtitle">
            Create encrypted notebooks secured behind private links and passwords. No accounts, no tracking — just write.
          </p>
          <div className="nb-hero__actions">
            <a href="/new" className="nb-btn nb-btn--primary nb-btn--lg">
              Create Notebook
            </a>
            <a href="/unlock" className="nb-btn nb-btn--secondary nb-btn--lg">
              Unlock Notebook
            </a>
          </div>
        </section>

        <div className="nb-features">
          <div className="nb-feature">
            <div className="nb-feature__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="nb-feature__title">End-to-end encrypted</div>
            <div className="nb-feature__desc">
              Content is encrypted before storage. Only you hold the key.
            </div>
          </div>
          <div className="nb-feature">
            <div className="nb-feature__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="nb-feature__title">Private link access</div>
            <div className="nb-feature__desc">
              Share via unique links. Custom slugs or auto-generated secure URLs.
            </div>
          </div>
          <div className="nb-feature">
            <div className="nb-feature__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <line x1="18" y1="8" x2="23" y2="13"/>
                <line x1="23" y1="8" x2="18" y2="13"/>
              </svg>
            </div>
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
