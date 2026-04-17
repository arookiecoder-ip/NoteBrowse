import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST, notebookRouteDependencies } from "../src/app/api/notebooks/route";
import { createNotebook, NotebookConflictError } from "../src/lib/notebooks/create-notebook";
import { createInMemoryNotebookRepository } from "../src/lib/notebooks/repository";

function setNotebookEncryptionKey(): void {
  process.env.NOTEBOOK_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
}

describe("notebook creation flow", () => {
  beforeEach(() => {
    setNotebookEncryptionKey();
  });

  it("creates custom slug notebooks and rejects collisions", async () => {
    const repository = createInMemoryNotebookRepository();

    const created = await createNotebook(
      {
        mode: "custom",
        slug: "Project-Notes",
        password: "super-secret-pass",
        content: "Encrypted notebook body",
      },
      { repository },
    );

    expect(created.slug).toBe("project-notes");
    expect(created.privateLink).toBe("/notebook/project-notes");

    await expect(
      createNotebook(
        {
          mode: "custom",
          slug: "project-notes",
          password: "another-secret",
          content: "Different body",
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(NotebookConflictError);

    const [stored] = await repository.list();
    expect(stored.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(stored.contentCiphertext).not.toContain("Encrypted notebook body");
    expect(stored.contentCiphertext).not.toContain("super-secret-pass");
  });

  it("creates random-link notebooks with opaque slugs and ciphertext-only storage", async () => {
    const repository = createInMemoryNotebookRepository();

    const created = await createNotebook(
      {
        mode: "random",
        password: "another-secret",
        content: "Notebook body for random mode",
      },
      {
        repository,
        randomSlug: () => "f".repeat(32),
      },
    );

    expect(created.slug).toBe("f".repeat(32));
    expect(created.privateLink).toBe(`/notebook/${"f".repeat(32)}`);

    const [stored] = await repository.list();
    expect(stored.slug).toBe("f".repeat(32));
    expect(stored.contentCiphertext).not.toContain("Notebook body for random mode");
    expect(stored.passwordHash).not.toContain("another-secret");
  });

  it("POST /api/notebooks delegates to the create service and returns the public locator", async () => {
    const original = notebookRouteDependencies.createNotebook;
    notebookRouteDependencies.createNotebook = vi.fn(async () => ({
      slug: "archive-2026",
      privateLink: "/notebook/archive-2026",
      createdAt: "2026-04-15T00:00:00.000Z",
    }));

    try {
      const response = await POST(
        new Request("http://localhost/api/notebooks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "custom",
            slug: "archive-2026",
            password: "super-secret-pass",
            content: "Public locator test",
          }),
        }),
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({
        slug: "archive-2026",
        privateLink: "/notebook/archive-2026",
      });
    } finally {
      notebookRouteDependencies.createNotebook = original;
    }
  });
});
