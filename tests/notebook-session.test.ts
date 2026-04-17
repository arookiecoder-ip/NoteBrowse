import { describe, expect, it } from "vitest";

import { createInMemoryNotebookSessionStore } from "../src/lib/notebooks/session-store";

describe("notebook session store", () => {
  it("creates notebook-scoped sessions and expires after inactivity", () => {
    let clock = new Date("2026-04-15T00:00:00.000Z").getTime();
    const now = () => new Date(clock);

    const store = createInMemoryNotebookSessionStore({
      idleTimeoutMs: 15 * 60 * 1000,
      now,
      createId: () => "session-1",
    });

    const created = store.createSession({
      notebookId: "nb-1",
      notebookSlug: "project-notes",
    });

    expect(created.notebookSlug).toBe("project-notes");

    clock += 10 * 60 * 1000;
    const touched = store.touchSession(created.id);
    expect(touched).not.toBeNull();

    clock += 14 * 60 * 1000;
    expect(store.getActiveSession(created.id)).not.toBeNull();

    clock += 2 * 60 * 1000;
    expect(store.getActiveSession(created.id)).toBeNull();
  });
});
