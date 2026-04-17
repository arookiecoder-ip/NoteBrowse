"use client";

import { useEffect, useState } from "react";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const cookie of document.cookie.split(";")) {
    const [key, ...val] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(val.join("="));
  }
  return null;
}

export function Editor({ slug }: { slug: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/notebooks/${slug}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = (await res.json()) as { content?: string; error?: string };

        if (!res.ok) {
          setError(data.error ?? "Notebook not found.");
          setLoading(false);
          return;
        }

        setContent(data.content ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load notebook.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify({ content }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
    } else {
      setSuccess("Changes saved.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify({ confirmDelete: true }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to delete.");
      setDeleting(false);
      setShowDelete(false);
      return;
    }

    setSuccess("Notebook deleted. Redirecting...");
    setShowDelete(false);
    setDeleting(false);
    setTimeout(() => window.location.assign("/notebook/new"), 500);
  }

  if (loading) {
    return <div className="nb-skeleton" style={{ marginTop: 24 }}><div className="nb-spinner" /><span>Loading notebook...</span></div>;
  }

  if (error && !content) {
    return (
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="nb-alert nb-alert--error">{error}</div>
        <a href="/notebook/unlock" className="nb-btn nb-btn--secondary">Go to Unlock</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="nb-field">
        <label htmlFor="editor-content" className="nb-field__label">Content</label>
        <textarea id="editor-content" className="nb-textarea" value={content} onChange={(e) => setContent(e.target.value)} rows={16} style={{ minHeight: 300 }} />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={handleSave} disabled={saving || deleting} className="nb-btn nb-btn--primary">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={() => setShowDelete(true)} disabled={saving || deleting} className="nb-btn nb-btn--danger">
          Delete Notebook
        </button>
      </div>

      {error && <div className="nb-alert nb-alert--error">{error}</div>}
      {success && <div className="nb-alert nb-alert--success">{success}</div>}

      {showDelete && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">Delete notebook permanently?</h2>
            <p className="nb-text">This action cannot be undone. The notebook and all content will be permanently deleted.</p>
            <div className="nb-modal__actions">
              <button type="button" onClick={() => setShowDelete(false)} className="nb-btn nb-btn--secondary">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="nb-btn nb-btn--danger" style={{ background: "var(--destructive)", color: "#fff", border: "none", fontWeight: 700 }}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
