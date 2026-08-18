import { useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { AdminScreen } from "@/screens/AdminScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { ChatRoomScreen } from "@/screens/ChatRoomScreen";
import { DetailScreen } from "@/screens/DetailScreen";
import { FeedScreen } from "@/screens/FeedScreen";
import { GradesScreen } from "@/screens/GradesScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { PublishScreen } from "@/screens/PublishScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { RoomsScreen } from "@/screens/RoomsScreen";
import { ScheduleScreen } from "@/screens/ScheduleScreen";
import { SyllabusScreen } from "@/screens/SyllabusScreen";
import { ROLE_SHORT } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { Bell, BookOpen, Calendar, Gauge, MessageSquare, User } from "lucide-react";

type View =
  | { name: "feed" }
  | { name: "detail"; annId: string }
  | { name: "publish" }
  | { name: "profile" }
  | { name: "admin" }
  | { name: "rooms" }
  | { name: "chat"; roomId: string }
  | { name: "schedule" }
  | { name: "syllabus" }
  | { name: "grades" };

export default function App() {
  const { ready, user, badges } = useStore();
  const [view, setView] = useState<View>({ name: "feed" });
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#\/reset\/([a-f0-9]+)/i);
    return m ? m[1] : null;
  });

  const go = (next: View) => {
    setView(next);
    window.scrollTo(0, 0);
  };

  const tab = useMemo(() => {
    if (view.name === "admin") return "admin";
    if (view.name === "profile" || view.name === "grades") return "profile";
    if (view.name === "rooms" || view.name === "chat") return "rooms";
    if (view.name === "schedule") return "schedule";
    if (view.name === "syllabus") return "syllabus";
    return "feed";
  }, [view]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onExit={() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          setResetToken(null);
        }}
      />
    );
  }

  if (!user) return <AuthScreen />;

  const isChat = view.name === "chat";
  const isRoot = ["feed", "profile", "admin", "rooms", "schedule", "syllabus"].includes(view.name);

  return (
    <div className="flex min-h-dvh flex-col">
      {!isChat && (
        <header className="topbar">
          <div className="mx-auto flex max-w-[720px] items-center gap-3 px-4 py-3">
            {isRoot ? (
              <>
                <Logo size={34} />
                <div>
                  <div className="text-[22px] font-bold tracking-tight">
                    2<span className="text-primary">late</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {tab === "feed" ? (user.pole ? `${ROLE_SHORT[user.role]} · Pôle ${user.pole}` : ROLE_SHORT[user.role]) : user.name}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-lg font-bold">
                {view.name === "detail" ? "Annonce" : view.name === "publish" ? "Nouvelle annonce" : view.name === "grades" ? "Mes notes" : ""}
              </div>
            )}
          </div>
        </header>
      )}

      {view.name === "feed" && (
        <main className="screen">
          <FeedScreen onOpen={(id) => go({ name: "detail", annId: id })} onPublish={() => go({ name: "publish" })} />
        </main>
      )}
      {view.name === "detail" && <DetailScreen id={view.annId} onBack={() => go({ name: "feed" })} />}
      {view.name === "publish" && <PublishScreen onDone={() => go({ name: "feed" })} onCancel={() => go({ name: "feed" })} />}
      {view.name === "profile" && <ProfileScreen onOpenGrades={() => go({ name: "grades" })} />}
      {view.name === "grades" && <GradesScreen onBack={() => go({ name: "profile" })} />}
      {view.name === "rooms" && (
        <main className="screen">
          <RoomsScreen onOpen={(id) => go({ name: "chat", roomId: id })} />
        </main>
      )}
      {view.name === "schedule" && (
        <main className="screen">
          <ScheduleScreen />
        </main>
      )}
      {view.name === "syllabus" && (
        <main className="screen">
          <SyllabusScreen />
        </main>
      )}
      {view.name === "chat" && <ChatRoomScreen roomId={view.roomId} onBack={() => go({ name: "rooms" })} />}
      {view.name === "admin" && user.role === "ADMIN" && <AdminScreen onOpen={(id) => go({ name: "detail", annId: id })} />}

      {!isChat && (
        <nav className="bottomnav">
          <div className="mx-auto grid max-w-[720px] auto-cols-fr grid-flow-col">
            <NavBtn active={view.name === "feed"} label="À lire" icon={<Bell size={22} />} badge={view.name !== "feed" ? badges.toRead : 0} onClick={() => go({ name: "feed" })} />
            {user.role === "ADMIN" && (
              <NavBtn active={view.name === "admin"} label="Admin" icon={<Gauge size={22} />} badge={view.name !== "admin" ? badges.pendingApplications : 0} onClick={() => go({ name: "admin" })} />
            )}
            <NavBtn
              active={tab === "rooms"}
              label="Salons"
              icon={<MessageSquare size={22} />}
              badge={tab !== "rooms" ? badges.chatUnread : 0}
              mention={tab !== "rooms" && badges.mentionPending}
              onClick={() => go({ name: "rooms" })}
            />
            <NavBtn active={view.name === "schedule"} label="Planning" icon={<Calendar size={22} />} onClick={() => go({ name: "schedule" })} />
            <NavBtn active={view.name === "syllabus"} label="Syllabus" icon={<BookOpen size={22} />} onClick={() => go({ name: "syllabus" })} />
            <NavBtn active={view.name === "profile"} label="Profil" icon={<User size={22} />} onClick={() => go({ name: "profile" })} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavBtn({
  active,
  label,
  icon,
  badge = 0,
  mention,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  badge?: number;
  mention?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", active ? "text-primary" : "text-[#7C899D]")}
      onClick={onClick}
    >
      {icon}
      {label}
      {mention ? (
        <span className="absolute right-[calc(50%-24px)] top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">@</span>
      ) : (
        badge > 0 && (
          <span className="absolute right-[calc(50%-24px)] top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )
      )}
    </button>
  );
}
