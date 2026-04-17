import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryAuditLogWriter } from "../src/lib/notebooks/audit-log";
import { DELETE, GET, PATCH, notebookBySlugRouteDependencies } from "../src/app/api/notebooks/[slug]/route";
import {
  deleteNotebookForSession,
  NotebookUsageError,
} from "../src/lib/notebooks/notebook-usage";
import { encryptNotebookContent } from "../src/lib/notebooks/crypto";
import { createInMemoryNotebookRepository } from "../src/lib/notebooks/repository";
import { serializeNotebookSessionCookie } from "../src/lib/notebooks/session-cookie";
import { createInMemoryNotebookSessionStore } from "../src/lib/notebooks/session-store";

function setNotebookEncryptionKey(): void {
  process.env.NOTEBOOK_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
}

describe("notebook delete and route behavior", () => {
  beforeEach(() => {
    setNotebookEncryptionKey();
    process.env.NOTEBOOK_SESSION_COOKIE = "nb_session";
  });

  it("requires explicit delete confirmation before hard delete", async () => {
    const ciphertext = encryptNotebookContent("initial notebook");
    const repository = createInMemoryNotebookRepository([
      {
        id: "nb-1",
        slug: "project-notes",
        mode: "custom",
        passwordHash: "scrypt$abc$def",
        contentCiphertext: ciphertext.ciphertext,
        contentNonce: ciphertext.nonce,
        contentKeyVersion: ciphertext.keyVersion,
        createdAt: new Date("2026-04-16T00:00:00.000Z"),
        updatedAt: new Date("2026-04-16T00:00:00.000Z"),
      },
    ]);
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    const auditLog = createInMemoryAuditLogWriter();

    sessionStore.createSession({ notebookId: "nb-1", notebookSlug: "project-notes" });

    await expect(
      deleteNotebookForSession(
        "project-notes",
        { sessionId: "session-1", notebookSlug: "project-notes" },
        false,
        { repository, sessionStore, auditLog, ip: "127.0.0.1" },
      ),
    ).rejects.toBeInstanceOf(NotebookUsageError);

    const deleted = await deleteNotebookForSession(
      "project-notes",
      { sessionId: "session-1", notebookSlug: "project-notes" },
      true,
      { repository, sessionStore, auditLog, ip: "127.0.0.1" },
    );

    expect(deleted.deleted).toBe(true);
    await expect(repository.findBySlug("project-notes")).resolves.toBeNull();
    expect(auditLog.list().some((event) => event.eventType === "notebook_deleted")).toBe(true);
  });

  it("route handlers map read/edit/delete flows with session cookie and confirmation", async () => {
    const ciphertext = encryptNotebookContent("initial notebook");
    const repository = createInMemoryNotebookRepository([
      {
        id: "nb-1",
        slug: "project-notes",
        mode: "custom",
        passwordHash: "scrypt$abc$def",
        contentCiphertext: ciphertext.ciphertext,
        contentNonce: ciphertext.nonce,
        contentKeyVersion: ciphertext.keyVersion,
        createdAt: new Date("2026-04-16T00:00:00.000Z"),
        updatedAt: new Date("2026-04-16T00:00:00.000Z"),
      },
    ]);
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    sessionStore.createSession({ notebookId: "nb-1", notebookSlug: "project-notes" });
    const auditLog = createInMemoryAuditLogWriter();

    const originalCreateRepository = notebookBySlugRouteDependencies.createRepository;
    const originalCreateAudit = notebookBySlugRouteDependencies.createAuditLogWriter;
    const originalGetSessionStore = notebookBySlugRouteDependencies.getSessionStore;

    notebookBySlugRouteDependencies.createRepository = vi.fn(async () => repository);
    notebookBySlugRouteDependencies.createAuditLogWriter = vi.fn(async () => auditLog);
    notebookBySlugRouteDependencies.getSessionStore = vi.fn(() => sessionStore);

    const cookie = serializeNotebookSessionCookie({
      sessionId: "session-1",
      notebookSlug: "project-notes",
      expiresAt: Date.now() + 60_000,
    });

    try {
      const readResponse = await GET(
        new Request("http://localhost/api/notebooks/project-notes", {
          method: "GET",
          headers: { cookie: `nb_session=${cookie}`, "x-forwarded-for": "127.0.0.1" },
        }),
        { params: Promise.resolve({ slug: "project-notes" }) },
      );

      expect(readResponse.status).toBe(200);

      const patchResponse = await PATCH(
        new Request("http://localhost/api/notebooks/project-notes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `nb_session=${cookie}`,
            "x-forwarded-for": "127.0.0.1",
          },
          body: JSON.stringify({ content: "updated notebook body" }),
        }),
        { params: Promise.resolve({ slug: "project-notes" }) },
      );

      expect(patchResponse.status).toBe(200);

      const deleteResponse = await DELETE(
        new Request("http://localhost/api/notebooks/project-notes", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `nb_session=${cookie}`,
            "x-forwarded-for": "127.0.0.1",
          },
          body: JSON.stringify({ confirmDelete: true }),
        }),
        { params: Promise.resolve({ slug: "project-notes" }) },
      );

      expect(deleteResponse.status).toBe(200);
      await expect(repository.findBySlug("project-notes")).resolves.toBeNull();
    } finally {
      notebookBySlugRouteDependencies.createRepository = originalCreateRepository;
      notebookBySlugRouteDependencies.createAuditLogWriter = originalCreateAudit;
      notebookBySlugRouteDependencies.getSessionStore = originalGetSessionStore;
    }
  });
});
