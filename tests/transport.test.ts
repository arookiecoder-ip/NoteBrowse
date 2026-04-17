import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("transport policy", () => {
  it("middleware enforces HTTPS redirect/refusal behavior", () => {
    const middleware = read("src/middleware.ts");
    expect(middleware).toContain("x-forwarded-proto");
    expect(middleware).toContain("https");
    expect(middleware).toContain("NextResponse.redirect");
  });

  it("middleware applies strict transport and security headers", () => {
    const middleware = read("src/middleware.ts");
    expect(middleware).toContain("Strict-Transport-Security");
    expect(middleware).toContain("X-Content-Type-Options");
    expect(middleware).toContain("Referrer-Policy");
    expect(middleware).toContain("X-Frame-Options");
  });

  it("next config exposes transport-safe baseline headers", () => {
    const config = read("next.config.ts");
    expect(config).toContain("Strict-Transport-Security");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("Referrer-Policy");
    expect(config).toContain("X-Frame-Options");
  });
});
