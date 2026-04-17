import { describe, expect, it } from "vitest";

import { issueCsrfToken, verifyCsrfToken } from "../src/lib/notebooks/csrf";

describe("verifyCsrfToken", () => {
  it("returns false when token is null", () => {
    expect(verifyCsrfToken(null, "expected-token")).toBe(false);
  });

  it("returns false when expected is null", () => {
    expect(verifyCsrfToken("some-token", null)).toBe(false);
  });

  it("returns false when both are null", () => {
    expect(verifyCsrfToken(null, null)).toBe(false);
  });

  it("returns false when token is empty string", () => {
    expect(verifyCsrfToken("", "expected-token")).toBe(false);
  });

  it("returns false when expected is empty string", () => {
    expect(verifyCsrfToken("some-token", "")).toBe(false);
  });

  it("returns false when tokens differ in length", () => {
    const a = "a".repeat(64);
    const b = "a".repeat(63);
    expect(verifyCsrfToken(a, b)).toBe(false);
  });

  it("returns false when tokens are same length but different content", () => {
    const expected = "a".repeat(64);
    // Same length, one character different at the end
    const tampered = "a".repeat(63) + "b";
    expect(verifyCsrfToken(tampered, expected)).toBe(false);
  });

  it("returns false when tokens are same length but differ only at position 0", () => {
    const expected = "a".repeat(64);
    const tampered = "b" + "a".repeat(63);
    expect(verifyCsrfToken(tampered, expected)).toBe(false);
  });

  it("returns true when tokens match exactly", () => {
    const token = "a".repeat(64);
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it("returns true for a real issued token compared against itself", () => {
    const token = issueCsrfToken();
    expect(verifyCsrfToken(token, token)).toBe(true);
  });

  it("returns false for two independently issued tokens (they should not collide)", () => {
    const tokenA = issueCsrfToken();
    const tokenB = issueCsrfToken();
    // Statistically certain given 64 hex chars of entropy
    expect(verifyCsrfToken(tokenA, tokenB)).toBe(false);
  });
});
