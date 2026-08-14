import { useMemo, useState } from 'react';
import { ROLE_LABELS } from '../types';
import { useStore } from '../store';
import { formatDateTime, initials } from '../utils';
import { IconDownload, IconLogout, IconMegaphone, IconUser } from '../ui/Icons';
import { RoleBadge } from '../components/Badges';

export function ProfileScreen() {
  const { user, db, logout, applyRelais, resetDemoData } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const [appModal, setAppModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [wa, setWa] = useState('');
  const [appErr, setAppErr] = useState<string | null>(null);

  const myApplication = useMemo(
    () => (user ? db.applications.find(a => a.userId === user.id && a.status === 'PENDING') : undefined),
    [db.applications, user]
  );
  const isRelais = user?.role === 'RELAIS';
  const canApply = user?.role === 'ETUDIANT';

  if (!user) return null;

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="profile-head">
        <div className="profile-avatar">{initials(user.name)}</div>
        <div className="grow">
          <div className="row">
            <span className="profile-name">{user.name}</span>
            <RoleBadge role={user.role} />
          </div>
          <div className="profile-mail">{user.email}</div>
          <div className="profile-mail">
            {user.pole ? `Pôle ${user.pole} · ` : ''}
            {ROLE_LABELS[user.role]} · inscrit le {formatDateTime(user.createdAt).split(' à ')[0]}
          </div>
        </div>
      </div>

      {canApply && (
        <>
          <h2 className="section-title">Statut Relais</h2>
          {myApplication ? (
            <div className="list-card">
              <div className="list-row">
                <div className="list-ico"><IconMegaphone size={19} /></div>
                <div className="grow">
                  <div className="list-label">Candidature envoyée</div>
                  <div className="list-sub">En attente de validation par l’administration.</div>
                </div>
              </div>
            </div>
          ) : isRelais ? null : (
            <div className="list-card">
              <div className="list-row">
                <div className="list-ico"><IconMegaphone size={19} /></div>
                <div className="grow">
                  <div className="list-label">Devenir Relais</div>
                  <div className="list-sub">Relayer les infos utiles de votre pôle, notées par la communauté.</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setAppModal(true); setAppErr(null); }}
                >
                  Postuler
                </button>
              </div>
            </div>
          )}

          {appModal && (
            <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAppModal(false); }}>
              <div className="modal" role="dialog" aria-modal="true" aria-label="Candidature Relais">
                <div className="modal-handle" />
                <div className="modal-title">
                  Candidature Relais
                  <button className="modal-close" onClick={() => setAppModal(false)} aria-label="Fermer">×</button>
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const err = applyRelais(msg, wa);
                    setAppErr(err);
                    if (!err) {
                      setAppModal(false);
                      setMsg('');
                      setWa('');
                    }
                  }}
                >
                  <div className="pill-info" style={{ marginBottom: 14 }}>
                    Votre message et votre numéro WhatsApp seront transmis à l’administration pour évaluer votre demande avant validation.
                  </div>
                  <div className="field">
                    <label>Message de motivation *</label>
                    <textarea
                      className="textarea"
                      value={msg}
                      onChange={e => setMsg(e.target.value)}
                      placeholder="Pourquoi vous ? Comment collectez-vous les informations de votre pôle (groupes, visios, Moodle) ?"
                    />
                  </div>
                  <div className="field">
                    <label>Numéro WhatsApp *</label>
                    <input className="input" value={wa} onChange={e => setWa(e.target.value)} placeholder="+241 06 12 34 56" inputMode="tel" />
                    <p className="hint">L’administration pourra vous contacter sur WhatsApp pour en savoir plus.</p>
                  </div>
                  {appErr && <p className="error-text">{appErr}</p>}
                  <div className="row mt12">
                    <button type="button" className="btn btn-ghost grow" onClick={() => setAppModal(false)}>Annuler</button>
                    <button type="submit" className="btn btn-primary grow">Envoyer ma candidature</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      <h2 className="section-title">Application</h2>
      <div className="list-card">
        <div className="list-row">
          <div className="list-ico"><IconDownload size={19} /></div>
          <div className="grow">
            <div className="list-label">Installer 2late</div>
            <div className="list-sub">Depuis le menu du navigateur : « Installer l’application » ou « Ajouter à l’écran d’accueil ».</div>
          </div>
        </div>
        <div className="list-row">
          <div className="list-ico"><IconUser size={19} /></div>
          <div className="grow">
            <div className="list-label">{db.users.length} comptes · {db.announcements.length} annonces</div>
            <div className="list-sub">Données de démonstration stockées localement sur cet appareil.</div>
          </div>
          {confirmReset ? (
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>Annuler</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  resetDemoData();
                  setConfirmReset(false);
                }}
              >
                Confirmer
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>Réinitialiser</button>
          )}
        </div>
      </div>

      <h2 className="section-title">Session</h2>
      <div className="list-card">
        <div className="list-row">
          <div className="list-ico"><IconLogout size={19} /></div>
          <div className="grow">
            <div className="list-label">Se déconnecter</div>
            <div className="list-sub">Vous revenez à l’écran de connexion.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </div>

      <p className="skeleton-note">2late · Démo locale — v0.1.0</p>
    </div>
  );
}
