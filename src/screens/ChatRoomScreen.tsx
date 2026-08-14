import { useEffect, useMemo, useRef, useState } from 'react';
import { canModerateRoom, messagesOf, roomAccessOf, roomById, roomParticipants } from '../data/chat';
import { userById } from '../data/db';
import { useStore } from '../store';
import { ROLE_LABELS } from '../types';
import type { ChatMessage, User } from '../types';
import { cx, formatDateTime, initials, timeAgo } from '../utils';
import { IconChat, IconChevronLeft, IconClose, IconLock, IconReply, IconSend, IconUsers } from '../ui/Icons';
import { RoleBadge } from '../components/Badges';
import { RoomIcon } from '../components/RoomIcon';

const REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];

interface Props {
  roomId: string;
  onBack: () => void;
}

export function ChatRoomScreen({ roomId, onBack }: Props) {
  const { db, user, sendChatMessage, softDeleteChatMessage, toggleChatReaction, markRoomVisited, setRoomAccess } = useStore();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menuMsg, setMenuMsg] = useState<ChatMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [accessErr, setAccessErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      document.documentElement.style.setProperty('--chat-h', `${Math.round(vv.height)}px`);
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      document.documentElement.style.removeProperty('--chat-h');
    };
  }, []);

  const room = roomById(roomId);
  const hasAccess = user ? roomAccessOf(db, user, roomId) : false;
  const messages = useMemo(() => messagesOf(db, roomId), [db, roomId]);
  const participants = useMemo(() => roomParticipants(db, roomId), [db, roomId]);

  useEffect(() => {
    if (hasAccess) markRoomVisited(roomId);
  }, [roomId, hasAccess, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, replyTo]);

  if (!user || !room) return null;

  const showToast = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const mentionUser = (u: User) => {
    const tag = `@${u.name.split(' ')[0]} `;
    setBody(prev => (prev.trim() ? `${prev.trimEnd()} ${tag}` : tag));
    setProfileUser(null);
    setMembersOpen(false);
    inputRef.current?.focus();
  };

  const mentionAll = () => {
    setBody(prev => (prev.trim() ? `${prev.trimEnd()} @Tous ` : '@Tous '));
    setMembersOpen(false);
    inputRef.current?.focus();
  };

  const canMention = (target: User): boolean => {
    if (!user || target.id === user.id) return false;
    if (target.role === 'PROF') return user.role === 'RELAIS' || user.role === 'ADMIN';
    return true;
  };

  const mentionQuery = (() => {
    const m = body.match(/@([\p{L}\p{N}_'-]*)$/u);
    return m ? m[1].toLowerCase() : null;
  })();

  const mentionCandidates = mentionQuery === null ? [] : participants.filter(p => p.id !== user.id && p.name.toLowerCase().includes(mentionQuery)).slice(0, 5);

  const applyMention = (p: User) => {
    setBody(prev => prev.replace(/@([\p{L}\p{N}_'-]*)$/u, `@${p.name.split(' ')[0]} `));
    inputRef.current?.focus();
  };

  const send = () => {
    if (!body.trim()) return;
    sendChatMessage(roomId, body, replyTo?.id);
    setBody('');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const menuAuthor = menuMsg ? userById(db, menuMsg.authorId) : undefined;
  const canDeleteMenu = menuMsg && (menuMsg.authorId === user.id || user.role === 'ADMIN');
  const canModerateMenu = menuMsg && menuAuthor ? canModerateRoom(user, room, menuAuthor) : false;
  const targetCurrentlyIn = menuMsg && menuAuthor ? roomAccessOf(db, menuAuthor, roomId) : false;

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: ChatMessage[] }> = [];
    for (const m of messages) {
      const day = new Date(m.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const last = out.at(-1);
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  if (!hasAccess) {
    return (
      <div className="screen" style={{ paddingTop: 12 }}>
        <button className="topbar-back" onClick={onBack} style={{ marginBottom: 14 }} aria-label="Retour">
          <IconChevronLeft size={20} />
        </button>
        <div className="empty">
          <div className="empty-ico"><IconLock size={24} /></div>
          <b>Accès révoqué</b>
          <p>Votre accès à ce salon a été révoqué. Contactez l’administration ou votre relais de pôle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-wrap">
      <header className="chat-header">
        <button className="topbar-back" onClick={onBack} aria-label="Retour">
          <IconChevronLeft size={20} />
        </button>
        <span className="room-emoji" style={{ width: 38, height: 38 }}><RoomIcon room={room} size={19} /></span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="chat-room-name">{room.name}</div>
          <div className="chat-room-sub">{participants.length} membres</div>
        </div>
        <button className="topbar-back" onClick={() => setMembersOpen(true)} aria-label="Membres">
          <IconUsers size={19} />
        </button>
      </header>

      <main className="chat-scroll">
        {groups.map(g => (
          <div key={g.day}>
            <div className="chat-day"><span>{g.day}</span></div>
            {g.items.map((m, i) => {
              const prev = g.items[i - 1];
              const grouped = !!prev && prev.authorId === m.authorId && !m.replyToId && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < 5 * 60_000;
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  mine={m.authorId === user.id}
                  grouped={grouped}
                  onMenu={setMenuMsg}
                  onReply={setReplyTo}
                  onProfile={setProfileUser}
                />
              );
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="empty" style={{ padding: '40px 24px' }}>
            <div className="empty-ico"><IconChat size={24} /></div>
            <b>Premier message</b>
            <p>Lancez la discussion dans « {room.name} » !</p>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {toast && <div className="chat-toast">{toast}</div>}

      <footer className="chat-composer">
        {replyTo && (
          <div className="chat-reply">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="chat-reply-label">
                Réponse à {userById(db, replyTo.authorId)?.name ?? '—'}
              </div>
              <div className="chat-reply-snippet">{replyTo.deleted ? 'Message supprimé' : replyTo.body}</div>
            </div>
            <button className="modal-close" onClick={() => setReplyTo(null)} aria-label="Annuler la réponse">
              <IconClose size={14} />
            </button>
          </div>
        )}

        {mentionCandidates.length > 0 && (
          <div className="mention-pop">
            {mentionCandidates.map(p => (
              <button key={p.id} type="button" className="mention-item" onMouseDown={e => { e.preventDefault(); applyMention(p); }}>
                <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(p.name)}</span>
                <span className="grow" style={{ textAlign: 'left' }}>{p.name}</span>
                {p.pole && <span className="badge badge-type">{p.pole}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-row">
          <input
            ref={inputRef}
            className="input chat-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder={`Message · @ pour mentionner`}
            aria-label="Message"
          />
          <button className="send-btn" onClick={send} disabled={!body.trim()} aria-label="Envoyer">
            <IconSend size={19} />
          </button>
        </div>
      </footer>

      {/* ---------- Menu contextuel (appui long / clic droit) ---------- */}
      {menuMsg && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setMenuMsg(null); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-handle" />
            <div className="menu-target">
              <span className="avatar">{initials(menuAuthor?.name ?? '?')}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="comment-author">{menuAuthor?.name ?? 'Utilisateur supprimé'}</div>
                <div className="chat-reply-snippet">{menuMsg.deleted ? 'Message supprimé' : menuMsg.body}</div>
              </div>
            </div>
            {!menuMsg.deleted && (
              <div className="reaction-picker">
                {REACTIONS.map(e => (
                  <button
                    key={e}
                    className={cx('reaction-pick', menuMsg.reactions?.some(r => r.emoji === e && r.userIds.includes(user.id)) && 'picked')}
                    onClick={() => { toggleChatReaction(menuMsg.id, e); setMenuMsg(null); }}
                    aria-label={`Réagir ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            {accessErr && <p className="error-text" style={{ marginTop: 6 }}>{accessErr}</p>}
            <div className="menu-list">
              <button
                className="menu-item"
                onClick={() => {
                  if (!menuMsg.deleted) navigator.clipboard?.writeText(menuMsg.body).catch(() => {});
                  setMenuMsg(null);
                  showToast('Message copié');
                }}
              >
                Copier le texte
              </button>
              <button
                className="menu-item"
                onClick={() => {
                  setReplyTo(menuMsg);
                  setMenuMsg(null);
                  inputRef.current?.focus();
                }}
              >
                Répondre
              </button>
              {canDeleteMenu && !menuMsg.deleted && (
                <button
                  className="menu-item danger"
                  onClick={() => {
                    softDeleteChatMessage(menuMsg.id);
                    setMenuMsg(null);
                  }}
                >
                  Supprimer le message
                </button>
              )}
              {canModerateMenu && (
                <button
                  className="menu-item danger"
                  onClick={() => {
                    const err = setRoomAccess(roomId, menuMsg.authorId, !targetCurrentlyIn);
                    setAccessErr(err);
                    if (!err) {
                      setMenuMsg(null);
                      showToast(targetCurrentlyIn
                        ? `Accès au salon révoqué pour ${menuAuthor?.name ?? 'cet utilisateur'}`
                        : `Accès au salon rétabli pour ${menuAuthor?.name ?? 'cet utilisateur'}`);
                    }
                  }}
                >
                  {targetCurrentlyIn ? 'Révoquer l’accès au salon' : 'Rétablir l’accès au salon'}
                </button>
              )}
            </div>
            <button className="btn btn-ghost btn-block mt8" onClick={() => setMenuMsg(null)}>Fermer</button>
          </div>
        </div>
      )}

      {/* ---------- Profil d'un membre ---------- */}
      {profileUser && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setProfileUser(null); }}>
          <div className="modal profile-modal" role="dialog" aria-modal="true" aria-label="Profil">
            <div className="modal-handle" />
            <button className="modal-close profile-close" onClick={() => setProfileUser(null)} aria-label="Fermer"><IconClose size={16} /></button>
            <div className="profile-hero">
              <div className="profile-big-avatar">{initials(profileUser.name)}</div>
              <div className="profile-hero-name">{profileUser.name}</div>
              <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
                <RoleBadge role={profileUser.role} />
                {profileUser.pole && <span className="badge badge-type">Pôle {profileUser.pole}</span>}
                {profileUser.disabled && <span className="badge badge-off">Compte désactivé</span>}
              </div>
              <dl className="profile-facts">
                <div>
                  <dt>Rôle</dt>
                  <dd>{ROLE_LABELS[profileUser.role]}</dd>
                </div>
                {profileUser.pole && (
                  <div>
                    <dt>Pôle</dt>
                    <dd>{profileUser.pole}</dd>
                  </div>
                )}
                <div>
                  <dt>Membre depuis</dt>
                  <dd>{formatDateTime(profileUser.createdAt).split(' à ')[0]}</dd>
                </div>
                {profileUser.id === user.id && (
                  <div>
                    <dt>E-mail</dt>
                    <dd>{profileUser.email}</dd>
                  </div>
                )}
              </dl>
            </div>
            {canMention(profileUser) ? (
              <button className="btn btn-primary btn-block" onClick={() => mentionUser(profileUser)}>
                Identifier @{profileUser.name.split(' ')[0]}
              </button>
            ) : profileUser.role === 'PROF' ? (
              <p className="hint" style={{ textAlign: 'center' }}>
                Seuls les relais et l’administration peuvent identifier un professeur.
              </p>
            ) : null}
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}

      {/* ---------- Liste des membres ---------- */}
      {membersOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setMembersOpen(false); }}>
          <div className="modal sheet-modal" role="dialog" aria-modal="true">
            <div className="modal-handle" />
            <div className="modal-title">
              <span className="row" style={{ gap: 8 }}><RoomIcon room={room} size={17} /> {room.name} — {participants.length} membres</span>
              <button className="modal-close" onClick={() => setMembersOpen(false)} aria-label="Fermer"><IconClose size={16} /></button>
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <button className="btn btn-primary btn-sm grow" onClick={mentionAll}>
                @ Identifier tous les membres
              </button>
            </div>
            <p className="hint" style={{ marginTop: -6, marginBottom: 10 }}>
              {user.role === 'ADMIN'
                ? 'Vous pouvez accorder ou révoquer l’accès à ce salon pour chaque membre.'
                : user.role === 'RELAIS' && room.id === 'general'
                  ? 'En tant que Relais, vous pouvez révoquer/rétablir l’accès des étudiants de votre pôle.'
                  : 'Participants ayant accès à ce salon.'}
            </p>

            <div className="sheet-scroll">
              {Object.entries(
                participants.reduce<Record<string, typeof participants>>((acc, p) => {
                  (acc[p.role] ??= []).push(p);
                  return acc;
                }, {})
              ).map(([role, list]) => (
                <div key={role}>
                  <div className="section-title" style={{ margin: '14px 0 2px' }}>
                    {ROLE_LABELS[role as User['role']]} · {list.length}
                  </div>
                  {list.map(p => {
                    const mod = canModerateRoom(user, room, p);
                    return (
                      <div
                        className="member-row member-clickable"
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setProfileUser(p)}
                        onKeyDown={e => { if (e.key === 'Enter') setProfileUser(p); }}
                      >
                        <span className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>{initials(p.name)}</span>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                            <span className="member-name">{p.name}</span>
                            <RoleBadge role={p.role} />
                          </div>
                          {p.pole && <div className="member-sub">Pôle {p.pole}</div>}
                        </div>
                        {mod && (
                          <button
                            className="btn btn-ghost btn-sm member-action"
                            style={{ color: 'var(--red)' }}
                            onClick={e => {
                              e.stopPropagation();
                              const err = setRoomAccess(roomId, p.id, false);
                              if (err) showToast(err);
                              else showToast(`Accès révoqué pour ${p.name}`);
                            }}
                          >
                            Révoquer
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <MembersGrant room={room} onToast={showToast} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MembersGrant({ room, onToast }: { room: { id: string; name: string }; onToast: (t: string) => void }) {
  const { db, user, setRoomAccess } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  if (!user || user.role !== 'ADMIN') return null;

  const outsiders = db.users
    .filter(u => u.id !== user.id && u.role !== 'ADMIN' && u.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter(u => !roomAccessOf(db, u, room.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ marginTop: 14 }}>
      <button className="btn btn-ghost btn-block" onClick={() => setOpen(o => !o)}>
        {open ? '× Fermer' : '＋ Ajouter des membres au salon'}
      </button>
      {open && (
        <>
          <input className="input" style={{ margin: '12px 0 4px' }} placeholder="Rechercher un membre…" value={q} onChange={e => setQ(e.target.value)} />
          {outsiders.slice(0, 10).map(u => (
            <div className="member-row" key={u.id}>
              <span className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>{initials(u.name)}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <span className="member-name">{u.name}</span>
                  <RoleBadge role={u.role} />
                </div>
                {u.pole && <div className="member-sub">Pôle {u.pole}</div>}
              </div>
              <button
                className="btn btn-ghost btn-sm member-action"
                onClick={() => {
                  const err = setRoomAccess(room.id, u.id, true);
                  onToast(err ?? `${u.name} peut rejoindre « ${room.name} »`);
                }}
              >
                + Accorder
              </button>
            </div>
          ))}
          {outsiders.length === 0 && <p className="hint">Tous les membres correspondants ont déjà accès.</p>}
        </>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  mine,
  grouped,
  onMenu,
  onReply,
  onProfile
}: {
  msg: ChatMessage;
  mine: boolean;
  grouped: boolean;
  onMenu: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void;
  onProfile: (u: User) => void;
}) {
  const { db, user, toggleChatReaction } = useStore();
  const author = userById(db, msg.authorId);
  const replied = msg.replyToId ? db.chatMessages.find(m => m.id === msg.replyToId) : undefined;
  const repliedAuthor = replied ? userById(db, replied.authorId) : undefined;

  const parts = msg.deleted ? [] : msg.body.split(/(@[\p{L}\p{N}_'-]+)/gu);
  const reactions = msg.reactions ?? [];

  // ---- Swipe pour répondre : droite = message d'autrui, gauche = le sien ----
  const [drag, setDrag] = useState(0);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (msg.deleted) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    dragging.current = false;
    pressTimer.current = window.setTimeout(() => {
      pressStart.current = null;
      onMenu(msg);
    }, 450);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = pressStart.current;
    if (!s) {
      if (dragging.current) setDrag(0);
      return;
    }
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) > 10) window.clearTimeout(pressTimer.current);
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      window.clearTimeout(pressTimer.current);
      dragging.current = true;
      const allowed = mine ? Math.min(0, dx) : Math.max(0, dx);
      const resisted = Math.sign(dx) === Math.sign(allowed) ? allowed : dx / 7;
      setDrag(Math.max(-110, Math.min(110, resisted)));
    }
  };

  const onPointerUp = () => {
    window.clearTimeout(pressTimer.current);
    const d = drag;
    pressStart.current = null;
    if (dragging.current) {
      dragging.current = false;
      setDrag(0);
      if (!mine && d >= 55) onReply(msg);
      if (mine && d <= -55) onReply(msg);
    }
  };

  const swipeHint = drag !== 0 && Math.abs(drag) > 14;

  return (
    <div className={cx('chat-msg swipe-wrap', mine && 'mine', grouped && 'grouped')}>
      {!mine && (
        <button
          className="avatar chat-avatar"
          style={{ width: 30, height: 30, fontSize: 11, visibility: grouped ? 'hidden' : 'visible' }}
          onClick={() => author && onProfile(author)}
          aria-label={`Voir le profil de ${author?.name ?? 'l’auteur'}`}
        >
          {initials(author?.name ?? '?')}
        </button>
      )}
      <div className="swipe-track" style={{ transform: `translateX(${drag}px)`, transition: drag === 0 ? 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)' : 'none' }}>
        {swipeHint && (
          <div className={cx('swipe-hint', mine ? 'left' : 'right')}>
            <IconReply size={17} />
          </div>
        )}
        <div
          className={cx('bubble', mine && 'own', msg.deleted && 'deleted')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={e => {
            if (msg.deleted) return;
            e.preventDefault();
            onMenu(msg);
          }}
        >
          {!mine && !grouped && (
            <button
              className="bubble-author"
              onClick={() => author && onProfile(author)}
              aria-label={`Voir le profil de ${author?.name ?? 'l’auteur'}`}
            >
              {author?.name ?? 'Utilisateur supprimé'}
              {author && <RoleBadge role={author.role} />}
            </button>
          )}
          {replied && (
            <div className="bubble-quote">
              <b>{repliedAuthor?.name ?? '—'}</b>
              <span>{replied.deleted ? 'Message supprimé' : replied.body.slice(0, 90)}</span>
            </div>
          )}
          {msg.deleted ? (
            <i style={{ color: 'var(--faint)' }}>Message supprimé</i>
          ) : (
            <p className="bubble-body">
              {parts.map((p, i) =>
                p.startsWith('@') && p.length > 1 ? <span key={i} className="mention">{p}</span> : <span key={i}>{p}</span>
              )}
            </p>
          )}
          {reactions.length > 0 && (
            <div className="reaction-row">
              {reactions.map(r => {
                const isMine = !!user && r.userIds.includes(user.id);
                return (
                  <button
                    key={r.emoji}
                    className={cx('reaction-chip', isMine && 'mine')}
                    onClick={() => toggleChatReaction(msg.id, r.emoji)}
                    aria-label={`${r.emoji} — ${r.userIds.length} réaction(s)`}
                  >
                    <span>{r.emoji}</span> {r.userIds.length}
                  </button>
                );
              })}
            </div>
          )}
          <span className="bubble-time">{timeAgo(msg.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
