import { UnlockForm } from "@/components/unlock-form";

export default function UnlockNotebookPage() {
  return (
    <main className="nb-bg">
      <div className="nb-page nb-page--narrow" style={{ paddingTop: 96 }}>
        <div className="nb-card">
          <div className="nb-page-header">
            <h1 className="nb-page-header__title">Unlock Notebook</h1>
            <p className="nb-page-header__desc">Enter your notebook Custom URL and password to access your notes.</p>
          </div>
          <UnlockForm />
        </div>
      </div>
    </main>
  );
}
