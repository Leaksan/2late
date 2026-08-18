import type { Route } from "@/app/routes";
import { activeTab } from "@/app/routes";
import { Logo } from "@/components/Logo";
import type { NavBadges, User } from "@/lib/types";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell, BookOpen, Calendar, Gauge, GraduationCap, MessageSquare, User as UserIcon } from "lucide-react";

export function SideNav({
  route,
  user,
  badges,
  onNavigate,
}: {
  route: Route;
  user: User;
  badges: NavBadges;
  onNavigate: (r: Route) => void;
}) {
  const tab = activeTab(route);
  const items: Array<{ id: string; label: string; icon: typeof Bell; r: Route; badge?: number; mention?: boolean }> = [
    { id: "today", label: "Aujourd’hui", icon: Bell, r: { name: "today", query: {} }, badge: badges.toRead },
    { id: "rooms", label: "Salons", icon: MessageSquare, r: { name: "rooms", query: {} }, badge: badges.chatUnread, mention: badges.mentionPending },
    { id: "schedule", label: "Planning", icon: Calendar, r: { name: "schedule", query: {} } },
    { id: "syllabus", label: "Syllabus", icon: BookOpen, r: { name: "syllabus", query: {} } },
    { id: "grades", label: "Notes", icon: GraduationCap, r: { name: "grades", query: {} } },
    { id: "profile", label: "Profil", icon: UserIcon, r: { name: "profile", query: {} } },
  ];
  if (user.role === "ADMIN") {
    items.push({ id: "admin", label: "Admin", icon: Gauge, r: { name: "admin", query: {} }, badge: badges.pendingApplications });
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-[200px] shrink-0 flex-col border-r border-border bg-card px-3 py-4 lg:flex" aria-label="Principal">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Logo size={28} />
        <span className="text-lg font-bold tracking-tight">
          2<span className="text-primary">late</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const on = tab === item.id || (item.id === "today" && (route.name === "publish" || (route.name === "detail" && route.query.from !== "admin")));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={cn(
                "flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigate(item.r)}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.mention ? (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">@</span>
              ) : (
                item.badge != null && item.badge > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{item.badge}</span>
                )
              )}
            </button>
          );
        })}
      </nav>
      <button className="mt-auto flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => onNavigate({ name: "profile", query: {} })}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-xs font-bold">{initials(user.name)}</span>
        <span className="truncate text-sm font-semibold">{user.name}</span>
      </button>
    </aside>
  );
}
