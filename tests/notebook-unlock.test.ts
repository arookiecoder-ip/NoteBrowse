import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST, unlockRouteDependencies } from "../src/app/api/notebooks/unlock/route";
import { hashNotebookPassword } from "../src/lib/notebooks/create-notebook";
import { createInMemoryNotebookRepository, type NotebookRecord } from "../src/lib/notebooks/repository";
import { createInMemoryNotebookSessionStore } from "../src/lib/notebooks/session-store";
import { unlockNotebookSession, UnlockSessionError } from "../src/lib/notebooks/unlock-session";

function seedNotebookRecord(): NotebookRecord {
  const timestamp = new Date("2026-04-15T00:00:00.000Z");
  return {
    id: "nb-1",
    slug: "project-notes",
    mode: "custom",
    passwordHash: hashNotebookPassword("super-secret-pass"),
    contentCiphertext: "cipher",
    contentNonce: "nonce",
    contentKeyVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("notebook unlock flow", () => {
  beforeEach(() => {
    process.env.NOTEBOOK_SESSION_COOKIE = "nb_session";
    process.env.NOTEBOOK_CSRF_COOKIE = "nb_csrf";
  });

  it("unlocks only with valid slug and password", async () => {
    const repository = createInMemoryNotebookRepository([seedNotebookRecord()]);
    const sessionStore = createInMemoryNotebookSessionStore({ createId: () => "session-abc" });

    const unlocked = await unlockNotebookSession(
      { slug: "project-notes", password: "super-secret-pass", ip: "127.0.0.1" },
      { repository, sessionStore },
    );

    expect(unlocked.session.id).toBe("session-abc");
    expect(unlocked.session.notebookSlug).toBe("project-notes");
  });

  it("returns uniform invalid credentials errors", async () => {
    const repository = createInMemoryNotebookRepository([seedNotebookRecord()]);
    const sessionStore = createInMemoryNotebookSessionStore();

    const wrongSlug = unlockNotebookSession(
      { slug: "missing-slug", password: "super-secret-pass", ip: "127.0.0.1" },
      { repository, sessionStore },
    );

    const wrongPassword = unlockNotebookSession(
      { slug: "project-notes", password: "wrong-pass-123", ip: "127.0.0.1" },
      { repository, sessionStore },
    );

    await expect(wrongSlug).rejects.toMatchObject({ reason: "invalid_credentials", statusCode: 401 });
    await expect(wrongPassword).rejects.toMatchObject({ reason: "invalid_credentials", statusCode: 401 });
  });

  it("POST /api/notebooks/unlock delegates to unlock service and sets hardened cookies", async () => {
    const originalUnlock = unlockRouteDependencies.unlockNotebookSession;
    const originalRepo = unlockRouteDependencies.createRepository;
    const originalStore = unlockRouteDependencies.getSessionStore;
    const originalLimiter = unlockRouteDependencies.getRateLimiter;

    unlockRouteDependencies.createRepository = vi.fn(async () => createInMemoryNotebookRepository([seedNotebookRecord()]));
    unlockRouteDependencies.getSessionStore = vi.fn(() => createInMemoryNotebookSessionStore({ createId: () => "session-abc" }));
    unlockRouteDependencies.getRateLimiter = vi.fn(() => ({
      assertAllowed: vi.fn(),
      registerFailure: vi.fn(),
      reset: vi.fn(),
    }));
    unlockRouteDependencies.unlockNotebookSession = vi.fn(async () => ({
      session: {
        id: "session-abc",
        notebookId: "nb-1",
        notebookSlug: "project-notes",
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
        lastActivityAt: new Date("2026-04-15T00:00:00.000Z"),
        expiresAt: new Date("2026-04-15T00:15:00.000Z"),
      },
    }));

    try {
      const response = await POST(
        new Request("http://localhost/api/notebooks/unlock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "127.0.0.1",
          },
          body: JSON.stringify({
            slug: "project-notes",
            password: "super-secret-pass",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie.toLowerCase()).toContain("samesite=strict");
      await expect(response.json()).resolves.toMatchObject({ unlocked: true, notebookLink: "/notebook/project-notes/edit" });
    } finally {
      unlockRouteDependencies.unlockNotebookSession = originalUnlock;
      unlockRouteDependencies.createRepository = originalRepo;
      unlockRouteDependencies.getSessionStore = originalStore;
      unlockRouteDependencies.getRateLimiter = originalLimiter;
    }
  });

  it("maps unlock service errors to route-safe responses", async () => {
    const originalUnlock = unlockRouteDependencies.unlockNotebookSession;
    const originalRepo = unlockRouteDependencies.createRepository;
    const originalStore = unlockRouteDependencies.getSessionStore;
    const originalLimiter = unlockRouteDependencies.getRateLimiter;

    unlockRouteDependencies.createRepository = vi.fn(async () => createInMemoryNotebookRepository([seedNotebookRecord()]));
    unlockRouteDependencies.getSessionStore = vi.fn(() => createInMemoryNotebookSessionStore());
    unlockRouteDependencies.getRateLimiter = vi.fn(() => ({
      assertAllowed: vi.fn(),
      registerFailure: vi.fn(),
      reset: vi.fn(),
    }));

    unlockRouteDependencies.unlockNotebookSession = vi.fn(async () => {
      throw new UnlockSessionError("invalid_credentials", 401);
    });

    try {
      const response = await POST(
        new Request("http://localhost/api/notebooks/unlock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "127.0.0.1",
          },
          body: JSON.stringify({ slug: "project-notes", password: "wrong-pass-123" }),
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "Invalid notebook link or password." });
    } finally {
      unlockRouteDependencies.unlockNotebookSession = originalUnlock;
      unlockRouteDependencies.createRepository = originalRepo;
      unlockRouteDependencies.getSessionStore = originalStore;
      unlockRouteDependencies.getRateLimiter = originalLimiter;
    }
  });

  it("unlock UI sources api call from unlock form and page wiring", () => {
    const formSource = readFileSync("src/components/notebook-unlock-form.tsx", "utf8");
    const pageSource = readFileSync("src/app/notebook/unlock/page.tsx", "utf8");

    expect(formSource).toContain('fetch("/api/notebooks/unlock"');
    expect(formSource).toContain("Private notebook link");
    expect(formSource).toContain("Notebook password");
    expect(formSource).toContain("Unable to unlock notebook. Check your link and password, then try again.");
    expect(pageSource).toContain("NotebookUnlockForm");
  });
});