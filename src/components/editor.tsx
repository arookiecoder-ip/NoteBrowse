"use client";

import { useEffect, useState } from "react";
import { MarkdownPreview } from "./markdown-preview";
import { MarkdownToolbar } from "./markdown-toolbar";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const cookie of document.cookie.split(";")) {
    const [key, ...val] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(val.join("="));
  }
  return null;
}

type EditorTab = "write" | "preview";

export function Editor({ slug }: { slug: string }) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const isDirty = content !== originalContent;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("write");
  const [warning, setWarning] = useState<string | null>(null);

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
        const data = (await res.json()) as { content?: string; error?: string; warning?: string };

        if (!res.ok) {
          setError(data.error ?? "Notebook not found.");
          setLoading(false);
          return;
        }

        setContent(data.content ?? "");
        setOriginalContent(data.content ?? "");
        if (data.warning) setWarning(data.warning);
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

  // Autosave
  useEffect(() => {
    if (!isDirty || saving || error) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isDirty, saving, error]);

  // Prevent accidental closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function handleSave(isAutosave = false) {
    const contentToSave = content;
    setSaving(true);
    if (!isAutosave) {
      setError(null);
      setSuccess(null);
    }

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify({ content: contentToSave }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
    } else {
      setOriginalContent(contentToSave);
      if (!isAutosave) {
        setSuccess("Changes saved.");
        setTimeout(() => setSuccess(null), 3000);
      }
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
    setTimeout(() => window.location.assign("/new"), 500);
  }

  if (loading) {
    return <div className="nb-skeleton" style={{ marginTop: 24 }}><div className="nb-spinner" /><span>Loading notebook...</span></div>;
  }

  if (error && !content) {
    return (
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="nb-alert nb-alert--error">{error}</div>
        <a href="/unlock" className="nb-btn nb-btn--secondary">Go to Unlock</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Tab Switcher + Toolbar ── */}
      <div className="nb-editor-header">
        <div className="nb-editor-tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "write"}
            className={`nb-editor-tab ${activeTab === "write" ? "nb-editor-tab--active" : ""}`}
            onClick={() => setActiveTab("write")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            className={`nb-editor-tab ${activeTab === "preview" ? "nb-editor-tab--active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
        </div>

        {activeTab === "write" && (
          <MarkdownToolbar
            textareaId="editor-content"
            content={content}
            onContentChange={setContent}
          />
        )}
      </div>

      {/* ── Editor / Preview Panel ── */}
      <div className="nb-editor-panel">
        {activeTab === "write" ? (
          <div className="nb-field">
            <textarea
              id="editor-content"
              className="nb-textarea nb-textarea--editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="# Start writing markdown...&#10;&#10;Use **bold**, _italic_, `code`, and more."
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="nb-preview-pane">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => handleSave(false)} disabled={saving || deleting || (!isDirty && !saving)} className="nb-btn nb-btn--primary">
          {saving ? "Saving..." : isDirty ? "Save Changes*" : "Saved"}
        </button>
        <button type="button" onClick={() => setShowChangePassword(true)} disabled={saving || deleting} className="nb-btn nb-btn--secondary">
          Change Password
        </button>
        <button type="button" onClick={() => setShowDelete(true)} disabled={saving || deleting} className="nb-btn nb-btn--danger">
          Delete Notebook
        </button>
      </div>

      {warning && <div className="nb-alert nb-alert--warning">{warning}</div>}
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
