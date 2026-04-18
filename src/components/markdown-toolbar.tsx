"use client";

import { useCallback } from "react";

interface ToolbarAction {
  label: string;
  icon: React.ReactNode;
  prefix: string;
  suffix: string;
  placeholder: string;
  block?: boolean;
}

const ACTIONS: ToolbarAction[] = [
  {
    label: "Bold",
    icon: <strong style={{ fontSize: 13 }}>B</strong>,
    prefix: "**",
    suffix: "**",
    placeholder: "bold text",
  },
  {
    label: "Italic",
    icon: <em style={{ fontSize: 13, fontFamily: "Georgia, serif" }}>I</em>,
    prefix: "_",
    suffix: "_",
    placeholder: "italic text",
  },
  {
    label: "Strikethrough",
    icon: <s style={{ fontSize: 12 }}>S</s>,
    prefix: "~~",
    suffix: "~~",
    placeholder: "strikethrough",
  },
  {
    label: "Code",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    prefix: "`",
    suffix: "`",
    placeholder: "code",
  },
  {
    label: "Link",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    prefix: "[",
    suffix: "](url)",
    placeholder: "link text",
  },
  {
    label: "Heading",
    icon: <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-heading)" }}>H</span>,
    prefix: "## ",
    suffix: "",
    placeholder: "heading",
    block: true,
  },
  {
    label: "Bullet list",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    prefix: "- ",
    suffix: "",
    placeholder: "list item",
    block: true,
  },
  {
    label: "Task list",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    prefix: "- [ ] ",
    suffix: "",
    placeholder: "task",
    block: true,
  },
  {
    label: "Code block",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <polyline points="9 8 5 12 9 16" />
        <polyline points="15 8 19 12 15 16" />
      </svg>
    ),
    prefix: "```\n",
    suffix: "\n```",
    placeholder: "code block",
    block: true,
  },
  {
    label: "Blockquote",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
      </svg>
    ),
    prefix: "> ",
    suffix: "",
    placeholder: "quote",
    block: true,
  },
];

interface MarkdownToolbarProps {
  textareaId: string;
  onContentChange: (newContent: string) => void;
  content: string;
}

export function MarkdownToolbar({ textareaId, onContentChange, content }: MarkdownToolbarProps) {
  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.slice(start, end);
      const before = content.slice(0, start);
      const after = content.slice(end);

      let insert: string;

      if (action.block && !before.endsWith("\n") && before.length > 0) {
        insert = "\n" + action.prefix + (selectedText || action.placeholder) + action.suffix;
      } else {
        insert = action.prefix + (selectedText || action.placeholder) + action.suffix;
      }

      const newContent = before + insert + after;
      onContentChange(newContent);

      // Restore focus and selection
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorStart = before.length + (action.block && !before.endsWith("\n") && before.length > 0 ? 1 : 0) + action.prefix.length;
        const cursorEnd = cursorStart + (selectedText || action.placeholder).length;
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [textareaId, content, onContentChange]
  );

  return (
    <div className="nb-md-toolbar" role="toolbar" aria-label="Markdown formatting">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          className="nb-md-toolbar__btn"
          title={action.label}
          aria-label={action.label}
          onClick={() => applyAction(action)}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
