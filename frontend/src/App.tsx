import { useEffect, useState } from "react";
import { backFromDetail, routeTitle, type FromView, type Route } from "@/app/routes";
import { useRoute } from "@/app/useRoute";
import { AppShell } from "@/components/AppShell";
import { OfflineBlocking } from "@/components/OfflineBanner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canPublish } from "@/lib/domain";
import { applyTheme } from "@/lib/theme";
import { resolveUiFlag } from "@/lib/ui-flag";
import { AdminApp } from "@/screens/AdminApp";
import { AdminScreen } from "@/screens/AdminScreen";
import { ADMIN_BUILD } from "@/lib/admin";
import { AuthScreen } from "@/screens/AuthScreen";
import { ChatRoomScreen } from "@/screens/ChatRoomScreen";
import { DetailScreen } from "@/screens/DetailScreen";
import { FeedScreen } from "@/screens/FeedScreen";
import { GradesScreen } from "@/screens/GradesScreen";
import { PlusScreen } from "@/screens/PlusScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { PublishScreen } from "@/screens/PublishScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { RoomsScreen } from "@/screens/RoomsScreen";
import { ScheduleScreen } from "@/screens/ScheduleScreen";
import { SyllabusScreen } from "@/screens/SyllabusScreen";
import { TodayScreen } from "@/screens/TodayScreen";
import { useStore } from "@/store";

export default function App() {
  const { ready, user, badges, offline, offlineBlocking, refresh } = useStore();

  // Interface d'administration : build séparé, jamais mêlé au site applicatif.
  if (ADMIN_BUILD) return <AdminApp />;

  const { route, navigate } = useRoute();
  const [ui] = useState(() => resolveUiFlag());
  const wide = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    applyTheme();
  }, []);

  useEffect(() => {
    if (route.name === "reset") {
      document.title = routeTitle(route);
      return;
    }
    document.title = user ? routeTitle(route) : "2late — Annonces universitaires";
  }, [route, user]);

  useEffect(() => {
    if (!user) return;
    if (route.name === "admin" && user.role !== "ADMIN") {
      navigate({ name: "today", query: {} }, { replace: true });
    } else if (route.name === "publish" && !canPublish(user)) {
      navigate({ name: "today", query: {} }, { replace: true });
    } else if (route.name === "plus" && (wide || ui === "v1")) {
      navigate({ name: "profile", query: {} }, { replace: true });
    }
  }, [route, user, wide, ui, navigate]);

  useEffect(() => {
    if (route.name !== "today") return;
    const y = sessionStorage.getItem("today.scrollY");
    if (y) {
      window.scrollTo(0, Number(y));
      sessionStorage.removeItem("today.scrollY");
    }
  }, [route.name]);

  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (route.name === "reset") {
    return (
      <ResetPasswordScreen
        token={route.token}
        onExit={() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          navigate({ name: "today", query: {} }, { replace: true });
        }}
      />
    );
  }

  if (offlineBlocking && !user) {
    return <OfflineBlocking onRetry={() => void refresh()} />;
  }

  if (!user) return <AuthScreen />;

  const go = (next: Route) => navigate(next);

  const openDetail = (id: string, from: FromView = "today") => {
    if (from === "today") sessionStorage.setItem("today.scrollY", String(window.scrollY));
    navigate({ name: "detail", annId: id, query: { from } });
  };

  const home = ui === "v2" ? (
    <TodayScreen
      onOpen={(id) => openDetail(id, "today")}
      onPublish={() => go({ name: "publish", query: {} })}
      onScheduleSlot={(slotId) => go({ name: "schedule", query: slotId ? { slot: slotId } : {} })}
      onScheduleNote={(noteId) => go({ name: "schedule", query: { note: noteId } })}
    />
  ) : (
    <main className="screen">
      <FeedScreen onOpen={(id) => openDetail(id, "today")} onPublish={() => go({ name: "publish", query: {} })} />
    </main>
  );

  const splitToday =
    wide && ui === "v2" && (route.name === "today" || (route.name === "detail" && route.query.from !== "admin" && route.query.from !== "plus"));
  const splitRooms = wide && (route.name === "rooms" || route.name === "chat");

  return (
    <AppShell route={route} user={user} badges={badges} ui={ui} offline={offline} onNavigate={go}>
      {splitToday && (
        <div className="flex min-h-0 flex-1">
          <div className="w-[320px] shrink-0 overflow-y-auto border-r border-border">{home}</div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {route.name === "detail" ? (
              <DetailScreen
                id={route.annId}
                from={route.query.from}
                hideBack
                onBack={() => navigate(backFromDetail(route), { scroll: false })}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">Sélectionnez une annonce</div>
            )}
          </div>
        </div>
      )}

      {splitRooms && (
        <div className="flex min-h-0 flex-1">
          <div className="w-[320px] shrink-0 overflow-y-auto border-r border-border p-4">
            <RoomsScreen onOpen={(id) => go({ name: "chat", roomId: id, query: {} })} selectedId={route.name === "chat" ? route.roomId : undefined} />
          </div>
          <div className="min-w-0 flex-1">
            {route.name === "chat" ? (
              <ChatRoomScreen roomId={route.roomId} onBack={() => go({ name: "rooms", query: {} })} />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">Sélectionnez un salon</div>
            )}
          </div>
        </div>
      )}

      {!splitToday && !splitRooms && (
        <>
          {route.name === "today" ? home : null}
          {route.name === "detail" && (
            <DetailScreen
              id={route.annId}
              from={route.query.from}
              onBack={() => navigate(backFromDetail(route), { scroll: false })}
            />
          )}
          {route.name === "publish" && (
            <PublishScreen onDone={() => go({ name: "today", query: {} })} onCancel={() => go({ name: "today", query: {} })} />
          )}
          {route.name === "profile" && <ProfileScreen onOpenGrades={() => go({ name: "grades", query: {} })} />}
          {route.name === "grades" && (
            <GradesScreen onBack={() => go({ name: route.query.from === "plus" ? "plus" : "profile", query: {} })} />
          )}
          {route.name === "rooms" && (
            <main className="screen">
              <RoomsScreen onOpen={(id) => go({ name: "chat", roomId: id, query: {} })} />
            </main>
          )}
          {route.name === "schedule" && (
            <main className="screen">
              <ScheduleScreen highlightSlotId={route.query.slot} openNoteId={route.query.note} />
            </main>
          )}
          {route.name === "syllabus" && (
            <main className="screen">
              <SyllabusScreen />
            </main>
          )}
          {route.name === "chat" && <ChatRoomScreen roomId={route.roomId} onBack={() => go({ name: "rooms", query: {} })} />}
          {route.name === "admin" && user.role === "ADMIN" && <AdminScreen onOpen={(id) => openDetail(id, "admin")} />}
          {route.name === "plus" && ui === "v2" && (
            <PlusScreen
              onSyllabus={() => go({ name: "syllabus", query: {} })}
              onGrades={() => go({ name: "grades", query: { from: "plus" } })}
              onProfile={() => go({ name: "profile", query: {} })}
              onAdmin={() => go({ name: "admin", query: {} })}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
