import { useMemo, useState } from 'react';
import { feeds } from './data/db';
import { useStore } from './store';
import { POLE_LABELS, ROLE_SHORT } from './types';
import { AuthScreen } from './screens/AuthScreen';
import { FeedScreen } from './screens/FeedScreen';
import { DetailScreen } from './screens/DetailScreen';
import { PublishScreen } from './screens/PublishScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { ChatRoomScreen } from './screens/ChatRoomScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { SyllabusScreen } from './screens/SyllabusScreen';
import { GradesScreen } from './screens/GradesScreen';
import { mentionPending, totalUnread } from './data/chat';
import { IconBell, IconBook, IconCalendar, IconChat, IconGauge, IconLogo, IconUser } from './ui/Icons';
import { cx } from './utils';
import type { Milestone } from './types';

type Tab = 'feed' | 'admin' | 'rooms' | 'schedule' | 'syllabus' | 'profile';

interface View {
  name: 'feed' | 'detail' | 'publish' | 'profile' | 'admin' | 'rooms' | 'chat' | 'schedule' | 'syllabus' | 'grades';
  annId?: string;
  roomId?: string;
}

const TAB_TITLES: Record<Tab, { title: string; sub: string }> = {
  feed: { title: '2late', sub: 'Annonces de l’université' },
  admin: { title: 'Administration', sub: 'Pilotage de la plateforme' },
  rooms: { title: 'Salons', sub: 'Discussions de la communauté' },
  schedule: { title: 'Planning', sub: 'Cours de la semaine' },
  syllabus: { title: 'Syllabus', sub: 'Documents officiels des cours' },
  profile: { title: 'Mon profil', sub: 'Compte et statut' }
};

function MilestonePopup() {
  const { db } = useStore();
  const [closed, setClosed] = useState(false);
  const active: Milestone | undefined = db.milestones
    .filter(m => m.reachedAt)
    .sort((a, b) => Date.parse(b.reachedAt!) - Date.parse(a.reachedAt!))[0];

  if (!active || closed) return null;
  if (localStorage.getItem(`2late.ms.${active.id}`) === active.reachedAt) return null;

  const dismiss = () => {
    localStorage.setItem(`2late.ms.${active.id}`, active.reachedAt!);
    setClosed(true);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="modal ms-modal" role="dialog" aria-modal="true">
        <div className="ms-emoji">🎉</div>
        <h2 className="ms-title">{active.title.replace(/\{n\}/g, String(active.threshold))}</h2>
        <p className="ms-message">{active.message.replace(/\{n\}/g, String(active.threshold))}</p>
        <button className="btn btn-primary btn-block" onClick={dismiss}>Merci à tous 💙</button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, db } = useStore();
  const [view, setView] = useState<View>({ name: 'feed' });
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#\/reset\/([a-f0-9]+)/i);
    return m ? m[1] : null;
  });

  const unreadCount = useMemo(() => (user ? feeds(db, user).toRead.length : 0), [db, user]);
  const pendingApps = useMemo(() => db.applications.filter(a => a.status === 'PENDING').length, [db.applications]);
  const chatUnread = useMemo(() => (user ? totalUnread(db, user.id) : 0), [db, user]);
  const mentioned = useMemo(() => (user ? mentionPending(db, user) : false), [db, user]);

  const exitReset = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setResetToken(null);
  };

  if (resetToken) return <ResetPasswordScreen token={resetToken} onExit={exitReset} />;

  if (!user) return <AuthScreen />;

  const tab: Tab = view.name === 'admin' ? 'admin' : view.name === 'profile' || view.name === 'grades' ? 'profile' : view.name === 'rooms' || view.name === 'chat' ? 'rooms' : view.name === 'schedule' ? 'schedule' : view.name === 'syllabus' ? 'syllabus' : 'feed';
  const isRoot = view.name === 'feed' || view.name === 'profile' || view.name === 'admin' || view.name === 'rooms' || view.name === 'schedule' || view.name === 'syllabus';
  const isChat = view.name === 'chat';
  const detailOk = view.name === 'detail' && !!view.annId && db.announcements.some(a => a.id === view.annId);

  const go = (name: View['name'], annId?: string, roomId?: string) => {
    setView({ name, annId, roomId });
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-shell">
      <MilestonePopup />
      {!isChat && (
      <header className="topbar">
        <div className="topbar-inner">
          {isRoot ? (
            <>
              <IconLogo size={34} />
              <div>
                <div className="topbar-title">
                  2<span style={{ color: 'var(--primary)' }}>late</span>
                </div>
                <div className="topbar-sub">
                  {tab === 'feed'
                    ? user.pole
                      ? `${ROLE_SHORT[user.role]} · Pôle ${user.pole}`
                      : ROLE_SHORT[user.role]
                    : user.name}
                </div>
              </div>
            </>
          ) : (
              <div>
                <div className="topbar-title" style={{ fontSize: 18 }}>
                  {view.name === 'detail' ? 'Annonce' : view.name === 'publish' ? 'Nouvelle annonce' : view.name === 'chat' ? 'Discussion' : view.name === 'grades' ? 'Mes notes' : ''}
                </div>
                <div className="topbar-sub">{user.pole ? POLE_LABELS[user.pole] : ROLE_SHORT[user.role]}</div>
              </div>
          )}
          <div className="topbar-spacer" />
        </div>
      </header>
      )}

      {(view.name === 'feed' || (view.name === 'detail' && !detailOk)) && (
        <main className="screen">
          <FeedScreen
            onOpen={id => go('detail', id)}
            onPublish={() => go('publish')}
          />
        </main>
      )}

      {detailOk && view.annId && (
        <DetailScreen id={view.annId} onBack={() => go('feed')} />
      )}

      {view.name === 'publish' && (
        <PublishScreen
          onDone={() => go('feed')}
          onCancel={() => go('feed')}
        />
      )}

      {view.name === 'profile' && <ProfileScreen onOpenGrades={() => go('grades')} />}

      {view.name === 'grades' && (
        <GradesScreen onBack={() => go('profile')} />
      )}

      {view.name === 'rooms' && (
        <main className="screen">
          <RoomsScreen onOpen={id => go('chat', undefined, id)} />
        </main>
      )}

      {view.name === 'schedule' && (
        <main className="screen">
          <ScheduleScreen />
        </main>
      )}

      {view.name === 'syllabus' && (
        <main className="screen">
          <SyllabusScreen />
        </main>
      )}

      {view.name === 'chat' && view.roomId && (
        <ChatRoomScreen roomId={view.roomId} onBack={() => go('rooms')} />
      )}

      {view.name === 'admin' && user.role === 'ADMIN' && <AdminScreen onOpen={id => go('detail', id)} />}

      {!isChat && (
      <nav className="bottomnav">
        <div className="bottomnav-inner">
          <button
            className={cx('bottomnav-item', view.name === 'feed' && 'active')}
            onClick={() => go('feed')}
          >
            <span className="nav-emoji">🔔</span>
            À lire
            {unreadCount > 0 && view.name !== 'feed' && <span className="bottomnav-badge">{unreadCount}</span>}
          </button>

          {user.role === 'ADMIN' && (
            <button
              className={cx('bottomnav-item', view.name === 'admin' && 'active')}
              onClick={() => go('admin')}
            >
              <span className="nav-emoji">📊</span>
              Admin
              {pendingApps > 0 && view.name !== 'admin' && <span className="bottomnav-badge">{pendingApps}</span>}
            </button>
          )}

          <button
            className={cx('bottomnav-item', tab === 'rooms' && 'active')}
            onClick={() => go('rooms')}
          >
            <span className="nav-emoji">💬</span>
            Salons
            {mentioned && tab !== 'rooms' ? (
              <span className="bottomnav-badge at" title="Vous avez été identifié">@</span>
            ) : (
              chatUnread > 0 && tab !== 'rooms' && <span className="bottomnav-badge">{chatUnread}</span>
            )}
          </button>

          <button
            className={cx('bottomnav-item', view.name === 'schedule' && 'active')}
            onClick={() => go('schedule')}
          >
            <span className="nav-emoji">📅</span>
            Planning
          </button>

          <button
            className={cx('bottomnav-item', view.name === 'syllabus' && 'active')}
            onClick={() => go('syllabus')}
          >
            <span className="nav-emoji">📚</span>
            Syllabus
          </button>

          <button
            className={cx('bottomnav-item', view.name === 'profile' && 'active')}
            onClick={() => go('profile')}
          >
            <span className="nav-emoji">👤</span>
            Profil
          </button>
        </div>
      </nav>
      )}
    </div>
  );
}
