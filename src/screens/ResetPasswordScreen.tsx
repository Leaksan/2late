import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { IconCheckCircle, IconLogo } from '../ui/Icons';

type Mode = 'form' | 'success' | 'invalid';

export function ResetPasswordScreen({ token, onExit }: { token: string; onExit: () => void }) {
  const { db, consumeResetToken } = useStore();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const mode0 = useMemo<Mode>(() => {
    const rec = db.resetTokens.find(t => t.token === token);
    if (!rec || rec.usedAt || Date.now() >= Date.parse(rec.expiresAt)) return 'invalid';
    return 'form';
  }, [db.resetTokens, token]);

  const [mode, setMode] = useState<Mode>(mode0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwd2) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const err = consumeResetToken(token, pwd);
    setError(err);
    if (!err) setMode('success');
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-logo"><IconLogo size={46} /></div>
        <div className="auth-name">2<em>late</em></div>
        <p className="auth-tag">Réinitialisation sécurisée de votre mot de passe.</p>
      </div>

      <div className="auth-card">
        {mode === 'invalid' && (
          <>
            <p className="comment-body" style={{ textAlign: 'center' }}>
              Ce lien est invalide, déjà utilisé ou expiré (validité 24 h, usage unique).
            </p>
            <p className="hint" style={{ textAlign: 'center' }}>Demandez un nouveau lien à l’administration.</p>
            <button className="btn btn-primary btn-block mt16" onClick={onExit}>Retour à l’application</button>
          </>
        )}

        {mode === 'success' && (
          <>
            <p className="comment-body row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left', color: 'var(--green)' }}>
              <span style={{ flex: 'none', marginTop: 2 }}><IconCheckCircle size={17} /></span>
              <span>Votre mot de passe a été modifié avec succès.</span>
            </p>
            <p className="hint" style={{ textAlign: 'center' }}>
              Le lien utilisé est désormais inutilisable. Vous pouvez vous connecter avec votre nouveau mot de passe.
            </p>
            <button className="btn btn-primary btn-block mt16" onClick={onExit}>Aller à la connexion</button>
          </>
        )}

        {mode === 'form' && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Nouveau mot de passe</label>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="4 caractères minimum"
                autoFocus
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label>Confirmer le mot de passe</label>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                value={pwd2}
                onChange={e => setPwd2(e.target.value)}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
              />
            </div>
            <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Afficher les mots de passe
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: 12 }}>
              Définir mon nouveau mot de passe
            </button>
            <p className="hint" style={{ textAlign: 'center' }}>
              Lien à usage unique — personne d’autre ne connaît votre nouveau mot de passe, pas même l’administration.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
