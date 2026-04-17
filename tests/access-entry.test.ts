import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("access entry routes", () => {
  it("has public notebook create route with Create Notebook CTA", () => {
    const file = read("src/app/notebook/new/page.tsx");
    expect(file).toContain("Create Notebook");
    expect(file).not.toMatch(/login|signup|sign up/i);
  });

  it("has public notebook unlock route without account gate language", () => {
    const file = read("src/app/notebook/unlock/page.tsx");
    expect(file).toContain("Unlock Notebook");
    expect(file).not.toMatch(/login required|account required/i);
  });
});
