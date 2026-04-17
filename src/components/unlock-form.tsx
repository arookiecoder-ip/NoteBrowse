"use client";

import { FormEvent, useState } from "react";

export function UnlockForm() {
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const normalizedSlug = slug.trim().toLowerCase().replace(/^\/notebook\//i, "").replace(/^\//, "");

    try {
      const res = await fetch("/api/notebooks/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: normalizedSlug, password }),
      });

      const data = (await res.json()) as { unlocked?: boolean; notebookLink?: string; error?: string };

      if (!res.ok || !data.unlocked) {
        setMessage(data.error ?? "Unable to unlock notebook. Check your slug and password.");
        return;
      }

      setMessage("Notebook unlocked. Redirecting...");
      if (data.notebookLink) window.location.assign(data.notebookLink);
    } catch {
      setMessage("Unable to unlock notebook. Check your slug and password.");
    } finally {
      setSubmitting(false);
    }
  }

  const isError = message && !message.includes("Redirecting");

  return (
    <form onSubmit={onSubmit} className="nb-form" style={{ marginTop: 24 }}>
      <div className="nb-field">
        <label htmlFor="notebook-slug" className="nb-field__label">Notebook Custom URL</label>
        <input id="notebook-slug" className="nb-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-notebook" autoComplete="off" />
      </div>

      <div className="nb-field">
        <label htmlFor="notebook-password" className="nb-field__label">Password</label>
        <input id="notebook-password" type="password" className="nb-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter notebook password" autoComplete="current-password" />
      </div>

      <button type="submit" disabled={submitting || !slug.trim()} className="nb-btn nb-btn--primary nb-btn--full">
        {submitting ? "Unlocking..." : "Unlock Notebook"}
      </button>

      {message && <div className={`nb-alert ${isError ? "nb-alert--error" : "nb-alert--success"}`}>{message}</div>}
    </form>
  );
}
