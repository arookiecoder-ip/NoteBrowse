import { describe, expect, it } from "vitest";

import { createInMemoryAuditLogWriter, hashAuditIp } from "../src/lib/notebooks/audit-log";
import { createInMemoryNotebookRepository } from "../src/lib/notebooks/repository";

describe("notebook audit logging", () => {
  it("accepts safe metadata fields and hashes client ip", async () => {
    const writer = createInMemoryAuditLogWriter();

    await writer.write({
      eventType: "notebook_viewed",
      notebookId: "nb-1",
      sessionId: "session-1",
      ip: "127.0.0.1",
    });

    const [event] = writer.list();
    expect(event.eventType).toBe("notebook_viewed");
    expect(event.notebookId).toBe("nb-1");
    expect(event.sessionId).toBe("session-1");
    expect(event.ipHash).toBe(hashAuditIp("127.0.0.1"));
    expect((event as unknown as Record<string, unknown>).content).toBeUndefined();
    expect((event as unknown as Record<string, unknown>).password).toBeUndefined();
    expect((event as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("repository supports update and delete by slug for usage flow", async () => {
    const now = new Date("2026-04-16T00:00:00.000Z");
    const repository = createInMemoryNotebookRepository([
      {
        id: "nb-1",
        slug: "project-notes",
        mode: "custom",
        passwordHash: "scrypt$abc$def",
        contentCiphertext: "cipher-v1",
        contentNonce: "nonce-v1",
        contentKeyVersion: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const updated = await repository.updateBySlug("project-notes", {
      contentCiphertext: "cipher-v2",
      contentNonce: "nonce-v2",
      contentKeyVersion: 1,
      updatedAt: new Date("2026-04-16T00:05:00.000Z"),
    });

    expect(updated?.contentCiphertext).toBe("cipher-v2");

    const deleted = await repository.deleteBySlug("project-notes");
    expect(deleted).toBe(true);
    await expect(repository.findBySlug("project-notes")).resolves.toBeNull();
  });
});
