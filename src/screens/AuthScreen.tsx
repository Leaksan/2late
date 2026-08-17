import { useState } from 'react';
import { POLES, POLE_LABELS, type Pole } from '../types';
import { useStore } from '../store';
import { IconLogo } from '../ui/Icons';

const DEMO = [
  { label: 'Admin', email: 'admin@2late.com', pwd: 'admin' },
  { label: 'Prof / Informaticien', email: 'prof@2late.com', pwd: 'prof' },
  { label: 'Relais STI', email: 'marc@2late.com', pwd: 'marc' },
  { label: 'Étudiant STI', email: 'etu@2late.com', pwd: 'etu' }
];

export function AuthScreen() {
  const { login, register } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pole, setPole] = useState<Pole>('STI');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = mode === 'login' ? login(email, password) : register(name, email, password, pole);
    setError(err);
  };

  const quickLogin = (em: string, pw: string) => {
    setError(login(em, pw));
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="auth-logo"><IconLogo size={46} /></div>
        <div className="auth-name">2<em>late</em></div>
        <p className="auth-tag">Les annonces officielles et communautaires de l’université — centralisées, lisibles, vérifiées.</p>
      </div>

      <div className="auth-card">
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Nom complet</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Grace Ondo" autoComplete="name" />
            </div>
          )}

          <div className="field">
            <label>Adresse e-mail</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@univ.ga" autoComplete="email" />
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Pôle académique</label>
              <div className="chips">
                {POLES.map(p => (
                  <button type="button" key={p} className={pole === p ? 'chip on' : 'chip'} onClick={() => setPole(p)} title={POLE_LABELS[p]}>
                    {p}
                  </button>
                ))}
              </div>
              <p className="hint">{POLE_LABELS[pole]}</p>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: 8 }}>
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte étudiant'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>Pas encore de compte ? <button type="button" onClick={() => { setMode('register'); setError(null); }}>S’inscrire</button></>
          ) : (
            <>Déjà inscrit ? <button type="button" onClick={() => { setMode('login'); setError(null); }}>Se connecter</button></>
          )}
        </p>

        {mode === 'login' && (
          <div className="demo-box">
            <h4>Comptes de démonstration</h4>
            {DEMO.map(d => (
              <button key={d.email} type="button" className="demo-row" onClick={() => quickLogin(d.email, d.pwd)}>
                <span><b>{d.label}</b> — {d.email}</span>
                <span>{d.pwd}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
