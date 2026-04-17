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

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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

  async function handlePasswordSave() {
    if (!oldPassword) {
      setPasswordError("Old password is required.");
      return;
    }
    if (!newPassword) {
      setPasswordError("New password cannot be empty.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify({ oldPassword, password: newPassword }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setPasswordError(data.error ?? "Failed to update password.");
    } else {
      setPasswordSuccess("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setShowChangePassword(false), 1500);
    }
    setSavingPassword(false);
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
        <button type="button" onClick={() => setShowChangePassword(true)} disabled={saving || deleting} className="nb-btn nb-btn--secondary">
          Change Password
        </button>
        <button type="button" onClick={() => setShowDelete(true)} disabled={saving || deleting} className="nb-btn nb-btn--danger">
          Delete Notebook
        </button>
      </div>

      {error && <div className="nb-alert nb-alert--error">{error}</div>}
      {success && <div className="nb-alert nb-alert--success">{success}</div>}

      {showChangePassword && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">Change Password</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              <div className="nb-field">
                <label htmlFor="old-password" className="nb-field__label">Old Password</label>
                <input
                  id="old-password"
                  type="password"
                  className="nb-input"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div className="nb-field">
                <label htmlFor="new-password" className="nb-field__label">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  className="nb-input"
                  placeholder="Enter a new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            
            {passwordError && <div className="nb-alert nb-alert--error">{passwordError}</div>}
            {passwordSuccess && <div className="nb-alert nb-alert--success">{passwordSuccess}</div>}

            <div className="nb-modal__actions" style={{ marginTop: 12 }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setOldPassword("");
                  setNewPassword("");
                }} 
                className="nb-btn nb-btn--secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handlePasswordSave} 
                disabled={savingPassword || !oldPassword || !newPassword} 
                className="nb-btn nb-btn--primary"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

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
