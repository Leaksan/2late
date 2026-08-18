import { describe, expect, it } from "vitest";
import { activeTab, backFromDetail, parseHash, toHash } from "./routes";

describe("parseHash", () => {
  it("splits path and query so schedule?slot does not fall through to today", () => {
    const r = parseHash("#/schedule?slot=abc");
    expect(r).toEqual({ name: "schedule", query: { slot: "abc" } });
  });

  it("parses note and from queries", () => {
    expect(parseHash("#/schedule?note=n1")).toEqual({ name: "schedule", query: { note: "n1" } });
    expect(parseHash("#/a/a1?from=admin")).toEqual({ name: "detail", annId: "a1", query: { from: "admin" } });
  });

  it("treats reset as a named route", () => {
    expect(parseHash("#/reset/deadbeef")).toEqual({ name: "reset", token: "deadbeef", query: {} });
  });

  it("defaults unknown paths to today", () => {
    expect(parseHash("")).toEqual({ name: "today", query: {} });
    expect(parseHash("#/")).toEqual({ name: "today", query: {} });
    expect(parseHash("#/today")).toEqual({ name: "today", query: {} });
  });

  it("parses chat and plus", () => {
    expect(parseHash("#/rooms/general")).toEqual({ name: "chat", roomId: "general", query: {} });
    expect(parseHash("#/plus")).toEqual({ name: "plus", query: {} });
    expect(parseHash("#/me")).toEqual({ name: "profile", query: {} });
  });
});

describe("toHash", () => {
  it("round-trips query params", () => {
    const r = parseHash("#/schedule?slot=abc&note=n1");
    expect(toHash(r)).toBe("#/schedule?slot=abc&note=n1");
    expect(toHash({ name: "detail", annId: "a1", query: { from: "today" } })).toBe("#/a/a1?from=today");
    expect(toHash({ name: "today", query: {} })).toBe("#/");
  });
});

describe("backFromDetail", () => {
  it("returns admin / plus / today from the from query", () => {
    expect(backFromDetail({ name: "detail", annId: "a1", query: { from: "admin" } }).name).toBe("admin");
    expect(backFromDetail({ name: "detail", annId: "a1", query: { from: "plus" } }).name).toBe("plus");
    expect(backFromDetail({ name: "detail", annId: "a1", query: {} }).name).toBe("today");
  });
});

describe("activeTab", () => {
  it("lights Plus for admin-sourced detail", () => {
    expect(activeTab({ name: "detail", annId: "a1", query: { from: "admin" } })).toBe("plus");
    expect(activeTab({ name: "detail", annId: "a1", query: { from: "today" } })).toBe("today");
    expect(activeTab({ name: "chat", roomId: "general", query: {} })).toBe("rooms");
  });
});
