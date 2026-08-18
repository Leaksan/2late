import type { ReactNode } from "react";
import type { Route } from "@/app/routes";
import { activeTab, type Route as R } from "@/app/routes";
import type { UiFlag } from "@/lib/ui-flag";
import type { NavBadges, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bell, BookOpen, Calendar, Gauge, LayoutGrid, MessageSquare, User as UserIcon } from "lucide-react";

type Item = { id: string; label: string; icon: ReactNode; route: Route; badge?: number; mention?: boolean; badgeLabel?: string };

export function navItems(user: User, badges: NavBadges, ui: UiFlag): Item[] {
  if (ui === "v2") {
    return [
      { id: "today", label: "Aujourd’hui", icon: <Bell size={22} />, route: { name: "today", query: {} }, badge: badges.toRead, badgeLabel: `${badges.toRead} annonces à lire` },
      {
        id: "rooms",
        label: "Salons",
        icon: <MessageSquare size={22} />,
        route: { name: "rooms", query: {} },
        badge: badges.chatUnread,
        mention: badges.mentionPending,
        badgeLabel: badges.mentionPending ? "Mention en attente" : `${badges.chatUnread} messages non lus`,
      },
      { id: "schedule", label: "Planning", icon: <Calendar size={22} />, route: { name: "schedule", query: {} } },
      {
        id: "plus",
        label: "Plus",
        icon: <LayoutGrid size={22} />,
        route: { name: "plus", query: {} },
        badge: user.role === "ADMIN" ? badges.pendingApplications : 0,
        badgeLabel: `${badges.pendingApplications} candidatures`,
      },
    ];
  }
  const items: Item[] = [
    { id: "today", label: "À lire", icon: <Bell size={22} />, route: { name: "today", query: {} }, badge: badges.toRead, badgeLabel: `${badges.toRead} annonces à lire` },
  ];
  if (user.role === "ADMIN") {
    items.push({
      id: "admin",
      label: "Admin",
      icon: <Gauge size={22} />,
      route: { name: "admin", query: {} },
      badge: badges.pendingApplications,
      badgeLabel: `${badges.pendingApplications} candidatures`,
    });
  }
  items.push(
    {
      id: "rooms",
      label: "Salons",
      icon: <MessageSquare size={22} />,
      route: { name: "rooms", query: {} },
      badge: badges.chatUnread,
      mention: badges.mentionPending,
      badgeLabel: badges.mentionPending ? "Mention en attente" : `${badges.chatUnread} messages non lus`,
    },
    { id: "schedule", label: "Planning", icon: <Calendar size={22} />, route: { name: "schedule", query: {} } },
    { id: "syllabus", label: "Syllabus", icon: <BookOpen size={22} />, route: { name: "syllabus", query: {} } },
    { id: "profile", label: "Profil", icon: <UserIcon size={22} />, route: { name: "profile", query: {} } },
  );
  return items;
}

export function BottomNav({
  route,
  user,
  badges,
  ui,
  onNavigate,
}: {
  route: R;
  user: User;
  badges: NavBadges;
  ui: UiFlag;
  onNavigate: (r: Route) => void;
}) {
  const tab = activeTab(route);
  const items = navItems(user, badges, ui);
  return (
    <nav className="bottomnav" aria-label="Principal">
      <div className="mx-auto grid max-w-[720px] auto-cols-fr grid-flow-col">
        {items.map((item) => {
          const active = tab === item.id || (item.id === "today" && (tab === "today" || route.name === "publish" || route.name === "detail"));
          const v2PlusActive = item.id === "plus" && (tab === "plus" || tab === "profile" || tab === "grades" || tab === "syllabus" || tab === "admin");
          const isOn = item.id === "plus" ? v2PlusActive : item.id === "today" ? tab === "today" || route.name === "publish" : active && item.id !== "today";
          return (
            <button
              key={item.id}
              className={cn("relative flex min-h-11 flex-col items-center gap-0.5 py-2.5 text-[12px] font-semibold", isOn ? "text-primary" : "text-muted-foreground")}
              onClick={() => onNavigate(item.route)}
              aria-current={isOn ? "page" : undefined}
            >
              {item.icon}
              {item.label}
              {item.mention ? (
                <span className="absolute right-[calc(50%-24px)] top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-label="Mention en attente">
                  @
                </span>
              ) : (
                item.badge != null &&
                item.badge > 0 && (
                  <span className="absolute right-[calc(50%-24px)] top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-label={item.badgeLabel}>
                    {item.badge}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
