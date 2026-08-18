import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav, navItems } from "./BottomNav";
import type { User } from "@/lib/types";

const etu: User = {
  id: "u",
  name: "Ada",
  email: "a@b.c",
  role: "ETUDIANT",
  pole: "STI",
  createdAt: "t",
};

const badges = { toRead: 2, chatUnread: 0, mentionPending: false, pendingApplications: 0 };

describe("navItems", () => {
  it("v1 keeps 5 student tabs, v2 has 4 including Plus", () => {
    expect(navItems(etu, badges, "v1").map((i) => i.id)).toEqual(["today", "rooms", "schedule", "syllabus", "profile"]);
    expect(navItems(etu, badges, "v2").map((i) => i.id)).toEqual(["today", "rooms", "schedule", "plus"]);
  });
});

describe("BottomNav", () => {
  it("marks the current tab with aria-current", () => {
    render(
      <BottomNav
        route={{ name: "today", query: {} }}
        user={etu}
        badges={badges}
        ui="v2"
        onNavigate={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Aujourd/i }).getAttribute("aria-current")).toBe("page");
  });
});
