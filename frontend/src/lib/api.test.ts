import { describe, expect, it } from "vitest";
import { apiUrl } from "./api";

describe("apiUrl", () => {
  it("keeps same-origin /api paths when no base is set", () => {
    expect(apiUrl("/api/feed", "")).toBe("/api/feed");
    expect(apiUrl("/api/auth/login")).toMatch(/^\/api\//);
  });

  it("prefixes a hosted Flask origin without doubling slashes", () => {
    expect(apiUrl("/api/feed", "https://api.example.com")).toBe("https://api.example.com/api/feed");
    expect(apiUrl("/api/feed", "https://api.example.com/")).toBe("https://api.example.com/api/feed");
  });
});
