"use client";

import { useState, type FormEvent } from "react";

type Mode = "custom" | "random";

export function CreateForm() {
  const [mode, setMode] = useState<Mode>("custom");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    setCreatedLink(null);
    setCopied(false);

    const res = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        slug: mode === "custom" ? slug : undefined,
        password,
        content,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string; privateLink?: string; slug?: string };

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Unable to create notebook.");
      return;
    }

    const link = data.privateLink ?? `/${data.slug}`;
    setStatus("success");
    setCreatedLink(link);
    setMessage("Notebook created successfully!");
    setSlug("");
    setPassword("");
    setContent("");
  }

  async function copyLink() {
    if (!createdLink) return;
    const fullUrl = `${window.location.origin}${createdLink}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="nb-form">
      <div className="nb-field">
        <span className="nb-field__label">Link mode</span>
        <div className="nb-radio-group">
          <div className="nb-radio-option">
            <input type="radio" name="mode" id="mode-custom" value="custom" checked={mode === "custom"} onChange={() => setMode("custom")} suppressHydrationWarning />
            <label htmlFor="mode-custom" className="nb-radio-option__label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Custom link
            </label>
          </div>
          <div className="nb-radio-option">
            <input type="radio" name="mode" id="mode-random" value="random" checked={mode === "random"} onChange={() => setMode("random")} suppressHydrationWarning />
            <label htmlFor="mode-random" className="nb-radio-option__label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              Random secure
            </label>
          </div>
        </div>
      </div>

      {mode === "custom" && (
        <div className="nb-field">
          <label htmlFor="slug" className="nb-field__label">Notebook custom URL Text</label>
          <input id="slug" autoComplete="off" data-1p-ignore="true" className="nb-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-awesome-notebook" maxLength={64} suppressHydrationWarning />
        </div>
      )}

      <div className="nb-field">
        <label htmlFor="password" className="nb-field__label">Password</label>
        <input id="password" type="password" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="nb-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a strong password" suppressHydrationWarning />
      </div>

      <div className="nb-field">
        <label htmlFor="content" className="nb-field__label">Content</label>
        <textarea id="content" className="nb-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the first entry for this notebook..." rows={6} suppressHydrationWarning />
      </div>

      <button type="submit" disabled={status === "saving"} className="nb-btn nb-btn--primary nb-btn--full">
        {status === "saving" ? "Creating..." : "Create Notebook"}
      </button>

      {message && status === "error" && <div className="nb-alert nb-alert--error">{message}</div>}

      {status === "success" && createdLink && (
        <div className="nb-alert nb-alert--success" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span>{message}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={createdLink} className="nb-link" style={{ wordBreak: "break-all", flex: 1 }}>
              {window.location.origin}{createdLink}
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="nb-btn nb-btn--secondary"
              style={{ flexShrink: 0, padding: "6px 14px", fontSize: 13 }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
