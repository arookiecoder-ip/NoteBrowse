import { beforeEach, describe, expect, it } from "vitest";

import { createInMemoryAuditLogWriter } from "../src/lib/notebooks/audit-log";
import { encryptNotebookContent } from "../src/lib/notebooks/crypto";
import {
  getNotebookForSession,
  NotebookUsageError,
  updateNotebookForSession,
} from "../src/lib/notebooks/notebook-usage";
import { createInMemoryNotebookRepository } from "../src/lib/notebooks/repository";
import { createInMemoryNotebookSessionStore } from "../src/lib/notebooks/session-store";

function setNotebookEncryptionKey(): void {
  process.env.NOTEBOOK_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
}

describe("notebook usage read and edit", () => {
  beforeEach(() => {
    setNotebookEncryptionKey();
  });

  it("returns decrypted content only for matching notebook session", async () => {
    const repository = createInMemoryNotebookRepository();
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    const auditLog = createInMemoryAuditLogWriter();

    await repository.create({
      slug: "project-notes",
      mode: "custom",
      passwordHash: "scrypt$abc$def",
      content: encryptNotebookContent("Seed notebook body"),
      createdAt: new Date("2026-04-16T00:00:00.000Z"),
      updatedAt: new Date("2026-04-16T00:00:00.000Z"),
    });

    const [stored] = await repository.list();
    sessionStore.createSession({ notebookId: stored.id, notebookSlug: stored.slug });

    const result = await getNotebookForSession(
      "project-notes",
      { sessionId: "session-1", notebookSlug: "project-notes" },
      { repository, sessionStore, auditLog, ip: "127.0.0.1" },
    );

    expect(result.slug).toBe("project-notes");
    expect(result.content).toBe("Seed notebook body");
    expect(auditLog.list()[0]?.eventType).toBe("notebook_viewed");
  });

  it("rejects read when session scope does not match slug", async () => {
    const repository = createInMemoryNotebookRepository();
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    const auditLog = createInMemoryAuditLogWriter();

    await repository.create({
      slug: "project-notes",
      mode: "custom",
      passwordHash: "scrypt$abc$def",
      content: encryptNotebookContent("Seed notebook body"),
      createdAt: new Date("2026-04-16T00:00:00.000Z"),
      updatedAt: new Date("2026-04-16T00:00:00.000Z"),
    });

    sessionStore.createSession({ notebookId: "nb-1", notebookSlug: "different-notebook" });

    await expect(
      getNotebookForSession(
        "project-notes",
        { sessionId: "session-1", notebookSlug: "different-notebook" },
        { repository, sessionStore, auditLog, ip: "127.0.0.1" },
      ),
    ).rejects.toBeInstanceOf(NotebookUsageError);
  });

  it("rejects read when notebook does not exist", async () => {
    const repository = createInMemoryNotebookRepository();
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    const auditLog = createInMemoryAuditLogWriter();

    sessionStore.createSession({ notebookId: "nb-1", notebookSlug: "missing-notebook" });

    await expect(
      getNotebookForSession(
        "missing-notebook",
        { sessionId: "session-1", notebookSlug: "missing-notebook" },
        { repository, sessionStore, auditLog, ip: "127.0.0.1" },
      ),
    ).rejects.toMatchObject({ reason: "not_found", statusCode: 404 });
  });

  it("rejects read with expired session", async () => {
    let nowMs = new Date("2026-04-16T00:00:00.000Z").getTime();
    const now = () => new Date(nowMs);
    const repository = createInMemoryNotebookRepository();
    const sessionStore = createInMemoryNotebookSessionStore({
      createId: () => "session-1",
      idleTimeoutMs: 500,
      now,
    });
    const auditLog = createInMemoryAuditLogWriter();

    await repository.create({
      slug: "project-notes",
      mode: "custom",
      passwordHash: "scrypt$abc$def",
      content: encryptNotebookContent("Seed notebook body"),
      createdAt: now(),
      updatedAt: now(),
    });

    sessionStore.createSession({ notebookId: "nb-1", notebookSlug: "project-notes" });
    nowMs += 1000;

    await expect(
      getNotebookForSession(
        "project-notes",
        { sessionId: "session-1", notebookSlug: "project-notes" },
        { repository, sessionStore, auditLog, ip: "127.0.0.1" },
      ),
    ).rejects.toMatchObject({ reason: "unauthorized", statusCode: 401 });
  });

  it("saves updates with re-encryption and audit event", async () => {
    const repository = createInMemoryNotebookRepository();
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-1" });
    const auditLog = createInMemoryAuditLogWriter();

    await repository.create({
      slug: "project-notes",
      mode: "custom",
      passwordHash: "scrypt$abc$def",
      content: encryptNotebookContent("Old notebook body"),
      createdAt: new Date("2026-04-16T00:00:00.000Z"),
      updatedAt: new Date("2026-04-16T00:00:00.000Z"),
    });

    const [stored] = await repository.list();
    sessionStore.createSession({ notebookId: stored.id, notebookSlug: stored.slug });

    const updated = await updateNotebookForSession(
      "project-notes",
      { sessionId: "session-1", notebookSlug: "project-notes" },
      "New notebook body",
      { repository, sessionStore, auditLog, ip: "127.0.0.1" },
    );

    expect(updated.saved).toBe(true);

    const refreshed = await repository.findBySlug("project-notes");
    expect(refreshed?.contentCiphertext).not.toContain("New notebook body");
    expect(auditLog.list().some((event) => event.eventType === "notebook_edited")).toBe(true);
  });
});
