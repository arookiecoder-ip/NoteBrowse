import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  decryptNotebookContent,
  encryptNotebookContent,
} from "../src/lib/notebooks/crypto";
import {
  normalizeNotebookCreateInput,
} from "../src/lib/notebooks/contracts";

function setNotebookEncryptionKey(): void {
  process.env.NOTEBOOK_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
}

describe("notebook contracts and crypto", () => {
  beforeEach(() => {
    setNotebookEncryptionKey();
  });

  it("normalizes custom and random notebook create inputs", () => {
    expect(
      normalizeNotebookCreateInput({
        mode: "custom",
        slug: "  Project Notes  ",
        password: "super-secret-pass",
        content: "Notebook body",
      }),
    ).toEqual({
      mode: "custom",
      slug: "project-notes",
      password: "super-secret-pass",
      content: "Notebook body",
    });

    expect(
      normalizeNotebookCreateInput({
        mode: "random",
        slug: "ignored",
        password: "another-secret",
        content: "Notebook body",
      }),
    ).toEqual({
      mode: "random",
      password: "another-secret",
      content: "Notebook body",
    });
  });

  it("encrypts content without leaking plaintext into persisted fields", () => {
    const record = encryptNotebookContent("Notebook body");

    expect(record.ciphertext).not.toContain("Notebook body");
    expect(record.nonce).not.toContain("Notebook body");
    expect(record.keyVersion).toBe(1);
    expect(decryptNotebookContent(record)).toBe("Notebook body");
  });

  it("declares the notebook schema with unique slugs and encrypted columns", () => {
    const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

    expect(schema).toMatch(/slug\s+String\s+@unique/);
    expect(schema).toContain("contentCiphertext");
    expect(schema).toContain("contentNonce");
    expect(schema).toContain("contentKeyVersion");
  });
});
