import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("notebook create UI", () => {
  it("exposes a public create surface with custom and random mode controls", () => {
    const formSource = readSource("src/components/notebook-create-form.tsx");
    const pageSource = readSource("src/app/notebook/new/page.tsx");

    expect(formSource).toContain("Create Notebook");
    expect(formSource).toContain('value="custom"');
    expect(formSource).toContain('value="random"');
    expect(formSource).toContain('fetch("/api/notebooks"');
    expect(formSource).toContain("Notebook password");
    expect(pageSource).toContain("NotebookCreateForm");
    expect(pageSource).toContain("Create a private notebook with a secure link.");
  });
});

describe("notebook usage UI", () => {
  it("defines dedicated edit route and editor integration", () => {
    const pageSource = readSource("src/app/notebook/[slug]/edit/page.tsx");
    expect(pageSource).toContain("NotebookEditor");
    expect(pageSource).toContain("Notebook Editor");
    expect(pageSource).toContain("params");
  });

  it("implements read/save/delete interactions with required copy contracts", () => {
    const editorSource = readSource("src/components/notebook-editor.tsx");

    expect(editorSource).toContain('fetch(`/api/notebooks/${slug}`)');
    expect(editorSource).toContain('method: "PATCH"');
    expect(editorSource).toContain('method: "DELETE"');
    expect(editorSource).toContain('confirmDelete: true');

    expect(editorSource).toContain("Notebook not found (session may have expired)");
    expect(editorSource).toContain("Changes saved.");
    expect(editorSource).toContain("Delete notebook permanently?");
    expect(editorSource).toContain("This action cannot be undone. The notebook and all content will be permanently deleted.");
    expect(editorSource).toContain("Confirm Delete");
    expect(editorSource).toContain('window.location.assign("/notebook/new")');
  });
});
