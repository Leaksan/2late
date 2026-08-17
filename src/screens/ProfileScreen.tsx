import { useMemo, useState } from 'react';
import { ROLE_LABELS } from '../types';
import { useStore } from '../store';
import { formatDateTime, frNum, initials, weightedAverage } from '../utils';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { IconCheckCircle, IconClose, IconDownload, IconGraduation, IconLogout, IconMegaphone, IconUser, IconWhatsapp } from '../ui/Icons';
import { RoleBadge } from '../components/Badges';

function InstallCard() {
  const { canInstall, isIos, isInstalled, install } = usePwaInstall();
  const [showSteps, setShowSteps] = useState(false);

  return (
    <>
      <div className="list-row">
        <div className="list-ico"><IconDownload size={19} /></div>
        <div className="grow">
          <div className="list-label">
            Installer 2late {isInstalled && <span className="install-ok"><IconCheckCircle size={13} /> installée</span>}
          </div>
          <div className="list-sub">
            {isInstalled
              ? 'Vous utilisez l’application installée.'
              : isIos
                ? 'Sur iPhone, l’installation se fait depuis Safari.'
                : 'Sur l’écran d’accueil, comme une vraie application.'}
          </div>
        </div>
        {!isInstalled && (
          <button className="btn btn-primary btn-sm" onClick={() => (canInstall ? void install() : setShowSteps(true))}>
            {canInstall ? 'Installer' : 'Comment ?'}
          </button>
        )}
      </div>
      {!isInstalled && (
        <div className="list-row">
          <div className="grow">
            <button className="link-like" onClick={() => setShowSteps(true)}>Voir les instructions d’installation</button>
          </div>
        </div>
      )}

      {showSteps && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSteps(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Installer l’application">
            <div className="modal-handle" />
            <div className="modal-title">
              Installer l’application
              <button className="modal-close" onClick={() => setShowSteps(false)} aria-label="Fermer"><IconClose size={15} /></button>
            </div>

            <div className="install-os">
              <div className="install-os-title">🤖 Android (Chrome)</div>
              {canInstall ? (
                <>
                  <p>Votre navigateur propose l’installation directe :</p>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={async () => {
                      const r = await install();
                      if (r === 'accepted') setShowSteps(false);
                    }}
                  >
                    Installer maintenant
                  </button>
                </>
              ) : (
                <ol className="install-steps">
                  <li>Appuyez sur le menu <b>⋮</b> en haut à droite de Chrome.</li>
                  <li>Choisissez <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »).</li>
                  <li>Confirmez — l’icône 2late apparaît sur votre écran d’accueil.</li>
                </ol>
              )}
            </div>

            <div className="install-os">
              <div className="install-os-title">🍎 iPhone / iPad (Safari)</div>
              <ol className="install-steps">
                <li>Ouvrez 2late dans <b>Safari</b> (obligatoire : pas depuis Chrome).</li>
                <li>Appuyez sur le bouton <b>Partager</b> <span className="share-ico">⬆︎</span> en bas de l’écran.</li>
                <li>Faites défiler puis choisissez <b>« Sur l’écran d’accueil »</b>.</li>
                <li>Appuyez sur <b>« Ajouter »</b> — l’app 2late s’ouvrira en plein écran.</li>
              </ol>
            </div>

            <button className="btn btn-ghost btn-block mt12" onClick={() => setShowSteps(false)}>Fermer</button>
          </div>
        </div>
      )}
    </>
  );
}

export function ProfileScreen({ onOpenGrades }: { onOpenGrades: () => void }) {
  const { user, db, logout, applyRelais, resetDemoData, setWhatsapp } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  const [appModal, setAppModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [wa, setWa] = useState('');
  const [appErr, setAppErr] = useState<string | null>(null);
  const [waValue, setWaValue] = useState(user?.whatsapp ?? '');
  const [waErr, setWaErr] = useState<string | null>(null);
  const [waSaved, setWaSaved] = useState(false);

  const myApplication = useMemo(
    () => (user ? db.applications.find(a => a.userId === user.id && a.status === 'PENDING') : undefined),
    [db.applications, user]
  );
  const isRelais = user?.role === 'RELAIS';
  const canApply = user?.role === 'ETUDIANT';
  const myGrades = useMemo(() => (user ? db.grades.filter(g => g.userId === user.id) : []), [db.grades, user]);
  const myAvg = weightedAverage(myGrades);

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

      <div className="list-card" style={{ marginBottom: 14 }}>
        <div className="list-row" style={{ alignItems: 'flex-start' }}>
          <div className="list-ico" style={{ marginTop: 2 }}><IconWhatsapp size={19} /></div>
          <div className="grow">
            <div className="list-label">Mon numéro WhatsApp</div>
            <input
              className="input"
              style={{ marginTop: 8 }}
              value={waValue}
              onChange={e => { setWaValue(e.target.value); setWaSaved(false); setWaErr(null); }}
              placeholder="+241 06 12 34 56"
              inputMode="tel"
            />
            {waErr && <p className="error-text">{waErr}</p>}
            {waSaved && !waErr && <p className="hint" style={{ color: 'var(--green)' }}>Numéro enregistré ✓</p>}
            <p className="hint">Permet à l’enseignant de vous contacter sur WhatsApp après un dépôt de documents.</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const err = setWhatsapp(waValue);
              setWaErr(err);
              setWaSaved(!err);
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>

      <h2 className="section-title">Résultats</h2>
      <div className="list-card">
        <div className="list-row">
          <div className="list-ico"><IconGraduation size={19} /></div>
          <div className="grow">
            <div className="list-label">Mes notes &amp; moyenne</div>
            <div className="list-sub">
              {myGrades.length > 0
                ? `${myGrades.length} note${myGrades.length > 1 ? 's' : ''} enregistrée${myGrades.length > 1 ? 's' : ''} · moyenne ${frNum(myAvg ?? 0)}/20`
                : 'Enregistrez vos notes de devoirs pour suivre votre moyenne.'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onOpenGrades}>Ouvrir</button>
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
        <InstallCard />
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

      <p className="skeleton-note">2late · Démo locale — v0.2.0</p>
    </div>
  );
}
