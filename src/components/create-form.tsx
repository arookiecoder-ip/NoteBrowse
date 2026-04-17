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

    const link = data.privateLink ?? `/notebook/${data.slug}`;
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
            <input type="radio" name="mode" id="mode-custom" value="custom" checked={mode === "custom"} onChange={() => setMode("custom")} />
            <label htmlFor="mode-custom" className="nb-radio-option__label">✏️ Custom link</label>
          </div>
          <div className="nb-radio-option">
            <input type="radio" name="mode" id="mode-random" value="random" checked={mode === "random"} onChange={() => setMode("random")} />
            <label htmlFor="mode-random" className="nb-radio-option__label">🎲 Random secure</label>
          </div>
        </div>
      </div>

      {mode === "custom" && (
        <div className="nb-field">
          <label htmlFor="slug" className="nb-field__label">Notebook custom URL Text</label>
          <input id="slug" className="nb-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="project-notes" />
        </div>
      )}

      <div className="nb-field">
        <label htmlFor="password" className="nb-field__label">Password</label>
        <input id="password" type="password" className="nb-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a strong password" />
      </div>

      <div className="nb-field">
        <label htmlFor="content" className="nb-field__label">Content</label>
        <textarea id="content" className="nb-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the first entry for this notebook..." rows={6} />
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
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
