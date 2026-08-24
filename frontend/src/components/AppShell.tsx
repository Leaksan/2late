import type { ReactNode } from "react";
import type { Route } from "@/app/routes";
import { Logo } from "@/components/Logo";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { NavBadges, User } from "@/lib/types";
import type { UiFlag } from "@/lib/ui-flag";
import { initials } from "@/lib/utils";

export function AppShell({
  route,
  user,
  badges,
  ui,
  offline,
  onNavigate,
  children,
}: {
  route: Route;
  user: User;
  badges: NavBadges;
  ui: UiFlag;
  offline: boolean;
  onNavigate: (r: Route, opts?: { replace?: boolean }) => void;
  children: ReactNode;
}) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const { keyboardOpen } = useKeyboardOpen();
  const isChat = route.name === "chat";
  const hideBottom = wide || isChat || (isChat && keyboardOpen);
  const hideTop = isChat;

  const shortDate = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="flex min-h-dvh">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      {wide && <SideNav route={route} user={user} badges={badges} onNavigate={onNavigate} />}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {!hideTop && (
          <header className="topbar">
            <div className="mx-auto flex h-14 max-w-[760px] items-center gap-3 px-4 lg:max-w-none">
              <Logo size={28} />
              <div className="min-w-0 flex-1">
                {route.name === "today" || route.name === "detail" ? (
                  <>
                    <div className="text-sm font-bold leading-tight">Aujourd’hui</div>
                    <div className="text-meta text-muted-foreground">{shortDate}</div>
                  </>
                ) : (
                  <div className="text-sm font-bold">
                    {route.name === "rooms"
                      ? "Salons"
                      : route.name === "schedule"
                        ? "Planning"
                        : route.name === "syllabus"
                          ? "Syllabus"
                          : route.name === "plus"
                            ? "Plus"
                            : route.name === "profile"
                              ? "Profil"
                              : route.name === "grades"
                                ? "Mes notes"
                                : route.name === "admin"
                                  ? "Admin"
                                  : route.name === "publish"
                                    ? "Nouvelle annonce"
                                    : "2late"}
                  </div>
                )}
              </div>
              <ThemeCycleButton />
              <button
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-xs font-bold"
                aria-label="Profil"
                onClick={() => onNavigate({ name: "profile", query: {} })}
              >
                {initials(user.name)}
              </button>
            </div>
          </header>
        )}
        {offline && <OfflineBanner />}
        <main id="main" className={isChat ? "flex min-h-0 flex-1 flex-col" : "flex-1"}>
          {children}
        </main>
        {!hideBottom && <BottomNav route={route} user={user} badges={badges} ui={ui} onNavigate={onNavigate} />}
      </div>
      <div id="live" className="sr-only" aria-live="polite" />
    </div>
  );
}
