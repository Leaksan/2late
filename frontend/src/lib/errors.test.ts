import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { classifyError } from "./errors";

describe("classifyError", () => {
  it("treats 401 as auth", () => {
    expect(classifyError(new ApiError("nope", 401))).toBe("auth");
  });

  it("treats TypeError and 5xx as network/http, never auth", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyError(new ApiError("boom", 500))).toBe("http");
    expect(classifyError(new ApiError("nope", 403))).toBe("http");
  });
});
