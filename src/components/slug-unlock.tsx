"use client";

import { FormEvent, useState } from "react";

export function SlugUnlock({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/notebooks/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });

      const data = (await res.json()) as { unlocked?: boolean; notebookLink?: string; error?: string };

      if (!res.ok || !data.unlocked) {
        setMessage(data.error ?? "Invalid password.");
        return;
      }

      setMessage("Unlocked! Redirecting...");
      if (data.notebookLink) window.location.assign(data.notebookLink);
    } catch {
      setMessage("Unable to unlock. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isError = message && !message.includes("Redirecting");

  return (
    <form onSubmit={onSubmit} className="nb-form" style={{ marginTop: 24 }}>
      <div className="nb-field">
        <label htmlFor="slug-password" className="nb-field__label">Password</label>
        <input id="slug-password" type="password" className="nb-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter notebook password" autoFocus autoComplete="current-password" suppressHydrationWarning />
      </div>

      <button type="submit" disabled={submitting || !password} className="nb-btn nb-btn--primary nb-btn--full">
        {submitting ? "Unlocking..." : "Unlock"}
      </button>

      {message && <div className={`nb-alert ${isError ? "nb-alert--error" : "nb-alert--success"}`}>{message}</div>}
    </form>
  );
}
