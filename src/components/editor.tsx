"use client";

import { useEffect, useRef, useState } from "react";
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

interface Page {
  id: string;
  title: string;
  order: number;
  content: string;
  warning?: string;
}

export function Editor({ slug }: { slug: string }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("write");

  // Per-page dirty tracking
  const originalContents = useRef<Record<string, string>>({});
  const originalTitles = useRef<Record<string, string>>({});

  // Password change
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // New page modal
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingPage, setAddingPage] = useState(false);

  // Rename page
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  // Delete page confirmation
  const [confirmDeletePageId, setConfirmDeletePageId] = useState<string | null>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;
  const isDirty = activePage
    ? activePage.content !== (originalContents.current[activePage.id] ?? activePage.content)
    : false;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/notebooks/${slug}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = (await res.json()) as { pages?: Page[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Notebook not found.");
          setLoading(false);
          return;
        }
        const loadedPages = data.pages ?? [];
        setPages(loadedPages);
        if (loadedPages.length > 0) setActivePageId(loadedPages[0].id);
        loadedPages.forEach((p) => {
          originalContents.current[p.id] = p.content;
          originalTitles.current[p.id] = p.title;
        });
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

  // Autosave active page
  useEffect(() => {
    if (!isDirty || saving || error || !activePage) return;
    const timer = setTimeout(() => handleSavePage(activePage.id, true), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.content, isDirty, saving, error]);

  // Warn on close if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function updatePageContent(id: string, content: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
  }

  async function handleSavePage(pageId: string, isAutosave = false) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setSaving(true);
    if (!isAutosave) { setError(null); setSuccess(null); }

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: JSON.stringify({ pageId, content: page.content }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
    } else {
      originalContents.current[pageId] = page.content;
      if (!isAutosave) {
        setSuccess("Changes saved.");
        setTimeout(() => setSuccess(null), 3000);
      }
    }
    setSaving(false);
  }

  async function handleRenamePageCommit(pageId: string) {
    const trimmed = editingTitleValue.trim();
    if (!trimmed) { setEditingTitleId(null); return; }
    if (trimmed === originalTitles.current[pageId]) { setEditingTitleId(null); return; }

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: JSON.stringify({ pageId, title: trimmed }),
    });

    if (res.ok) {
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title: trimmed } : p)));
      originalTitles.current[pageId] = trimmed;
    }
    setEditingTitleId(null);
  }

  async function handleAddPage() {
    setAddingPage(true);
    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: JSON.stringify({ title: newPageTitle.trim() || "Untitled" }),
    });

    const data = (await res.json().catch(() => ({}))) as Page & { error?: string };
    if (res.ok) {
      const newPage: Page = { id: data.id, title: data.title, order: data.order, content: "" };
      setPages((prev) => [...prev, newPage]);
      originalContents.current[newPage.id] = "";
      originalTitles.current[newPage.id] = newPage.title;
      setActivePageId(newPage.id);
      setShowNewPage(false);
      setNewPageTitle("");
    } else {
      setError(data.error ?? "Failed to add page.");
    }
    setAddingPage(false);
  }

  async function handleDeletePage(pageId: string) {
    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: JSON.stringify({ pageId }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to delete page.");
      return;
    }

    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== pageId);
      if (activePageId === pageId && remaining.length > 0) {
        setActivePageId(remaining[0].id);
      }
      return remaining;
    });
    delete originalContents.current[pageId];
    delete originalTitles.current[pageId];
  }

  async function handlePasswordSave() {
    if (!oldPassword) { setPasswordError("Old password is required."); return; }
    if (!newPassword) { setPasswordError("New password cannot be empty."); return; }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: JSON.stringify({ oldPassword, password: newPassword }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setPasswordError(data.error ?? "Failed to update password.");
    } else {
      setPasswordSuccess("Password updated successfully.");
      setOldPassword(""); setNewPassword("");
      setTimeout(() => setShowChangePassword(false), 1500);
    }
    setSavingPassword(false);
  }

  async function handleDeleteNotebook() {
    setDeleting(true);
    setError(null);

    const csrf = readCookie("nb_csrf");
    const res = await fetch(`/api/notebooks/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
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

  if (error && pages.length === 0) {
    return (
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="nb-alert nb-alert--error">{error}</div>
        <a href="/unlock" className="nb-btn nb-btn--secondary">Go to Unlock</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Pages Sidebar ── */}
      <div className="nb-pages-bar">
        <div className="nb-pages-list" role="tablist" aria-label="Notebook pages">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`nb-page-tab ${page.id === activePageId ? "nb-page-tab--active" : ""}`}
              role="tab"
              aria-selected={page.id === activePageId}
            >
              {editingTitleId === page.id ? (
                <input
                  className="nb-page-tab__rename-input"
                  value={editingTitleValue}
                  autoFocus
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => handleRenamePageCommit(page.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenamePageCommit(page.id);
                    if (e.key === "Escape") setEditingTitleId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  type="button"
                  className="nb-page-tab__title"
                  onClick={() => setActivePageId(page.id)}
                  onDoubleClick={() => {
                    setEditingTitleId(page.id);
                    setEditingTitleValue(page.title);
                  }}
                  title="Click to switch · Double-click to rename"
                >
                  {page.title}
                </button>
              )}
              {pages.length > 1 && (
                <button
                  type="button"
                  className="nb-page-tab__delete"
                  title="Delete page"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeletePageId(page.id); }}
                  aria-label={`Delete page ${page.title}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="nb-btn nb-btn--secondary nb-pages-add"
          onClick={() => setShowNewPage(true)}
          title="Add new page"
          aria-label="Add new page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Page
        </button>
      </div>

      {activePage && (
        <>
          {activePage.warning && <div className="nb-alert nb-alert--warning">{activePage.warning}</div>}

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
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </button>
            </div>

            {activeTab === "write" && (
              <MarkdownToolbar
                textareaId="editor-content"
                content={activePage.content}
                onContentChange={(val) => updatePageContent(activePage.id, val)}
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
                  value={activePage.content}
                  onChange={(e) => updatePageContent(activePage.id, e.target.value)}
                  rows={16}
                  placeholder="# Start writing markdown...&#10;&#10;Use **bold**, _italic_, `code`, and more."
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="nb-preview-pane">
                <MarkdownPreview content={activePage.content} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleSavePage(activePage.id, false)}
              disabled={saving || deleting || !isDirty}
              className="nb-btn nb-btn--primary"
            >
              {saving ? "Saving..." : isDirty ? "Save Changes*" : "Saved"}
            </button>
            <button type="button" onClick={() => setShowChangePassword(true)} disabled={saving || deleting} className="nb-btn nb-btn--secondary">
              Change Password
            </button>
            <button type="button" onClick={() => setShowDelete(true)} disabled={saving || deleting} className="nb-btn nb-btn--danger">
              Delete Notebook
            </button>
          </div>
        </>
      )}

      {error && <div className="nb-alert nb-alert--error">{error}</div>}
      {success && <div className="nb-alert nb-alert--success">{success}</div>}

      {/* ── New Page Modal ── */}
      {showNewPage && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">New Page</h2>
            <div className="nb-field" style={{ marginTop: 12 }}>
              <label htmlFor="new-page-title" className="nb-field__label">Page Title</label>
              <input
                id="new-page-title"
                className="nb-input"
                placeholder="Untitled"
                value={newPageTitle}
                autoFocus
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPage(); }}
              />
            </div>
            <div className="nb-modal__actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => { setShowNewPage(false); setNewPageTitle(""); }} className="nb-btn nb-btn--secondary">Cancel</button>
              <button type="button" onClick={handleAddPage} disabled={addingPage} className="nb-btn nb-btn--primary">
                {addingPage ? "Adding..." : "Add Page"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {showChangePassword && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">Change Password</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              <div className="nb-field">
                <label htmlFor="old-password" className="nb-field__label">Old Password</label>
                <input id="old-password" type="password" className="nb-input" placeholder="Enter current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="nb-field">
                <label htmlFor="new-password" className="nb-field__label">New Password</label>
                <input id="new-password" type="password" className="nb-input" placeholder="Enter a new secure password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            {passwordError && <div className="nb-alert nb-alert--error">{passwordError}</div>}
            {passwordSuccess && <div className="nb-alert nb-alert--success">{passwordSuccess}</div>}
            <div className="nb-modal__actions" style={{ marginTop: 12 }}>
              <button type="button" onClick={() => { setShowChangePassword(false); setPasswordError(null); setPasswordSuccess(null); setOldPassword(""); setNewPassword(""); }} className="nb-btn nb-btn--secondary">Cancel</button>
              <button type="button" onClick={handlePasswordSave} disabled={savingPassword || !oldPassword || !newPassword} className="nb-btn nb-btn--primary">
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Page Confirmation Modal ── */}
      {confirmDeletePageId && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">Delete this page?</h2>
            <p className="nb-text">
              &ldquo;{pages.find((p) => p.id === confirmDeletePageId)?.title}&rdquo; will be permanently deleted. This cannot be undone.
            </p>
            <div className="nb-modal__actions">
              <button type="button" onClick={() => setConfirmDeletePageId(null)} className="nb-btn nb-btn--secondary">Cancel</button>
              <button
                type="button"
                onClick={() => { handleDeletePage(confirmDeletePageId); setConfirmDeletePageId(null); }}
                className="nb-btn nb-btn--danger"
                style={{ background: "var(--destructive)", color: "#fff", border: "none", fontWeight: 700 }}
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Notebook Modal ── */}
      {showDelete && (
        <div className="nb-overlay" role="dialog" aria-modal="true">
          <div className="nb-modal">
            <h2 className="nb-heading-lg">Delete notebook permanently?</h2>
            <p className="nb-text">This action cannot be undone. The notebook and all its pages will be permanently deleted.</p>
            <div className="nb-modal__actions">
              <button type="button" onClick={() => setShowDelete(false)} className="nb-btn nb-btn--secondary">Cancel</button>
              <button type="button" onClick={handleDeleteNotebook} disabled={deleting} className="nb-btn nb-btn--danger" style={{ background: "var(--destructive)", color: "#fff", border: "none", fontWeight: 700 }}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
