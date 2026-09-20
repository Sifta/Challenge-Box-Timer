import { useEffect, useRef, useState } from 'react';

/* ============================================================
   CHALLENGE BOX TIMER
   ------------------------------------------------------------
   Ablauf: QR-Code-Scan (#/vinci oder #/zodiak)
     -> Team-Registrierung (Teamname + Set-Nummer)
     -> Digitales Briefing (wischbare Infoseiten)
     -> "Bereit, die Challenge anzunehmen?" (Ja / Nein)
     -> Startfrage -> richtige Antwort startet den Countdown
     -> Countdown (120 / 90 Min) + dauerhaftes Eingabefeld
        für den finalen Code (Summe der beiden Codes)
     -> richtiger Code stoppt die Zeit -> Erfolgsmeldung

   Alle Lösungen werden NUR im Backend geprüft (server.js).
   Die Zeit wird serverseitig gemessen: Display aus, Browser
   schliessen oder Neu laden beeinträchtigt den Countdown nicht
   (Reconnect über die gespeicherte Team-ID).

   Operator-Dashboard: #/operator
   ============================================================ */

/* Öffentliche Spiel-Infos für die Anzeige.
   Die Antworten stehen bewusst NICHT hier (siehe server.js). */
const GAMES = {
  vinci: {
    title: 'Vinci',
    durationLabel: '120 Minuten',
    setPrefix: 'CH',
    startQuestion: 'Wie lautet das Todesjahr des grossen Meisters?',
    startHint: 'Dieser Code öffnet das Vorhängeschloss der ersten Box.',
  },
  zodiak: {
    title: 'Zodiak',
    durationLabel: '90 Minuten',
    setPrefix: 'ZD',
    startQuestion: 'Wie viele Tierkreiszeichen gibt es?',
    startHint: 'Diese Zahl öffnet das Vorhängeschloss der ersten Box.',
  },
};

const BRIEFING_PAGES = [
  {
    title: 'iPad & Augmented Reality',
    text: 'Nutzt das iPad für die Augmented-Reality-Erlebnisse. Haltet das Gerät ruhig und folgt den Anweisungen auf dem Bildschirm. Behandelt es sorgfältig.',
  },
  {
    title: 'Das Manuskript',
    text: 'Lest das Manuskript sorgfältig und vollständig. Alle Informationen, die ihr für die Challenge braucht, stehen darin. Verliert es nicht aus den Augen.',
  },
  {
    title: 'Wichtige Hinweise',
    text: 'Wendet keine rohe Gewalt an – weder an den Kisten noch am Material. Alles lässt sich mit Logik und Teamwork lösen. Helft einander und habt Spass.',
  },
];

/* ---------- API ---------- */

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Serverfehler');
  return data;
}

/* ---------- helpers ---------- */

function getRoute() {
  const match = window.location.hash.match(/^#\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/* ============================================================
   Bildschirme
   ============================================================ */

function ConnectionError({ message }) {
  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Verbindungsproblem</p>
      <h1 className="cbt-title">Server nicht erreichbar</h1>
      <p className="cbt-sub">
        {message}. Bitte prüfen, ob das Backend läuft ({`node server.js`}), und die
        Seite neu laden.
      </p>
    </div>
  );
}

function Register({ game, gameId, onRegistered }) {
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState('');
  const [freeSets, setFreeSets] = useState(null);
  const [setId, setSetId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api(`/games/${gameId}`)
      .then((d) => setFreeSets(d.freeSets))
      .catch((e) => setError(e.message));
  }, [gameId]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!teamName.trim()) return setError('Bitte einen Teamnamen eingeben.');
    if (!setId) return setError('Bitte eine Set-Nummer auswählen.');
    try {
      setSubmitting(true);
      const team = await api('/register', {
        method: 'POST',
        body: JSON.stringify({
          game: gameId,
          teamName,
          set: Number(setId),
          players: players ? Number(players) : null,
        }),
      });
      onRegistered(team);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Team-Registrierung</p>
      <h1 className="cbt-title">{game.title}</h1>
      <p className="cbt-sub">
        Willkommen bei eurer Challenge ({game.durationLabel}). Registriert euch,
        um loszulegen.
      </p>
      <form onSubmit={submit} className="cbt-form">
        <label className="cbt-label">
          Teamname
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="z. B. Die goldenen Entdecker"
            maxLength={40}
            autoFocus
          />
        </label>
        <label className="cbt-label">
          Set-Nummer
          <select
            value={setId}
            onChange={(e) => setSetId(e.target.value)}
            disabled={!freeSets}
          >
            <option value="">
              {freeSets === null ? 'Lade Sets…' : 'Bitte auswählen'}
            </option>
            {(freeSets || []).map((label) => (
              <option key={label} value={Number(label.slice(2))}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="cbt-label">
          Anzahl Spieler (optional)
          <input
            type="number"
            min="1"
            max="50"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            placeholder="z. B. 4"
          />
        </label>
        {error && <p className="cbt-error">{error}</p>}
        <button type="submit" className="cbt-btn" disabled={submitting}>
          Registrieren
        </button>
      </form>
    </div>
  );
}

function Briefing({ game, onDone }) {
  const [page, setPage] = useState(0);
  const touchStart = useRef(null);
  const last = page === BRIEFING_PAGES.length - 1;

  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (dx < -40 && page < BRIEFING_PAGES.length - 1) setPage(page + 1);
    if (dx > 40 && page > 0) setPage(page - 1);
    touchStart.current = null;
  };

  return (
    <div className="cbt-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <p className="cbt-eyebrow">Digitales Briefing · {game.title}</p>
      <div className="cbt-swipe" key={page}>
        <p className="cbt-swipe-number">{String(page + 1).padStart(2, '0')}</p>
        <h1 className="cbt-title">{BRIEFING_PAGES[page].title}</h1>
        <p className="cbt-sub">{BRIEFING_PAGES[page].text}</p>
      </div>
      <div className="cbt-dots">
        {BRIEFING_PAGES.map((_, i) => (
          <span key={i} className={i === page ? 'cbt-dot-active' : ''} />
        ))}
      </div>
      <div className="cbt-btn-row">
        {page > 0 && (
          <button className="cbt-btn cbt-btn-ghost" onClick={() => setPage(page - 1)}>
            Zurück
          </button>
        )}
        <button className="cbt-btn" onClick={() => (last ? onDone() : setPage(page + 1))}>
          {last ? 'Weiter' : 'Nächste Seite'}
        </button>
      </div>
      <p className="cbt-sub cbt-sub-small">Zum Blättern wischen</p>
    </div>
  );
}

function Ready({ game, onYes, onNo }) {
  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">{game.title}</p>
      <h1 className="cbt-title">Bereit, die Challenge anzunehmen?</h1>
      <p className="cbt-sub">
        Sobald ihr mit Ja bestätigt, erscheint die erste Frage. Euer Countdown
        läuft noch nicht – erst die richtige Antwort startet die Uhr.
      </p>
      <div className="cbt-btn-row">
        <button className="cbt-btn" onClick={onYes}>
          Ja
        </button>
        <button className="cbt-btn cbt-btn-ghost" onClick={onNo}>
          Nein
        </button>
      </div>
    </div>
  );
}

function Question({ game, team, onSolved }) {
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const updated = await api('/start', {
        method: 'POST',
        body: JSON.stringify({ teamId: team.id, answer }),
      });
      onSolved(updated);
    } catch (err) {
      setWrong(true);
      setError(err.message === 'Falsche Antwort' ? 'Nicht ganz – beratet euch und versucht es erneut.' : err.message);
      setTimeout(() => setWrong(false), 600);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Erste Frage</p>
      <h1 className="cbt-title">{game.startQuestion}</h1>
      <p className="cbt-sub">{game.startHint}</p>
      <form onSubmit={submit} className="cbt-form">
        <label className="cbt-label">
          Eure Antwort
          <input
            type="text"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Antwort eingeben…"
            className={wrong ? 'cbt-shake cbt-wrong' : ''}
            autoFocus
          />
        </label>
        {error && <p className="cbt-error">{error}</p>}
        <button type="submit" className="cbt-btn" disabled={submitting}>
          Countdown starten
        </button>
      </form>
    </div>
  );
}

function Playing({ team, onFinish }) {
  const [sync, setSync] = useState({ remainingMs: team.remainingMs, fetchedAt: Date.now() });
  const [remaining, setRemaining] = useState(team.remainingMs);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const teamId = team.id;

  /* lokale Uhr ticken lassen */
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, sync.remainingMs - (Date.now() - sync.fetchedAt)));
    }, 250);
    return () => clearInterval(id);
  }, [sync]);

  /* regelmässig und beim Aufwecken mit dem Server abgleichen */
  useEffect(() => {
    const resync = async () => {
      try {
        const t = await api(`/team/${teamId}`);
        setSync({ remainingMs: t.remainingMs, fetchedAt: Date.now() });
        setRemaining(t.remainingMs);
      } catch {
        /* offline: lokale Uhr läuft weiter */
      }
    };
    const id = setInterval(resync, 15000);
    document.addEventListener('visibilitychange', resync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [teamId]);

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const finished = await api('/finish', {
        method: 'POST',
        body: JSON.stringify({ teamId, code }),
      });
      onFinish(finished);
    } catch (err) {
      setWrong(true);
      setError(
        err.message === 'Falscher Code'
          ? 'Das ist nicht der richtige Code. Weiter geht’s!'
          : err.message,
      );
      setTimeout(() => setWrong(false), 600);
    } finally {
      setSubmitting(false);
    }
  };

  const low = remaining < 10 * 60 * 1000;
  const over = remaining <= 0;

  return (
    <div className="cbt-card">
      <p className={`cbt-eyebrow ${over ? '' : 'cbt-eyebrow-live'}`}>
        {!over && <span className="cbt-dot" />}
        {over ? 'Zeit abgelaufen' : 'Countdown läuft'} · Team {team.teamName} · Set{' '}
        {team.setLabel}
      </p>
      <div className={`cbt-timer ${low ? 'cbt-timer-low' : ''}`}>{formatCountdown(remaining)}</div>
      {over ? (
        <p className="cbt-sub">
          Eure Zeit ist abgelaufen. Gebt euren finalen Code trotzdem ein, sofern
          ihr ihn gefunden habt.
        </p>
      ) : (
        <p className="cbt-sub">
          Öffnet nacheinander die Kisten. Jede offene Kiste verrät den Code für
          die nächste. Wenn ihr beide Codes gefunden habt, gebt unten deren Summe
          ein.
        </p>
      )}
      <form onSubmit={submitCode} className="cbt-form">
        <label className="cbt-label">
          Finaler Code (Summe der beiden Codes)
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="z. B. 495"
            className={wrong ? 'cbt-shake cbt-wrong' : ''}
          />
        </label>
        {error && <p className="cbt-error">{error}</p>}
        <button type="submit" className="cbt-btn" disabled={submitting}>
          Code prüfen
        </button>
      </form>
      <p className="cbt-sub cbt-sub-small">
        Display aus oder Seite neu laden? Kein Problem – euer Countdown läuft
        serverseitig weiter.
      </p>
    </div>
  );
}

function Finished({ game, team, onRestart }) {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api(`/leaderboard/${team.game}`)
      .then(setBoard)
      .catch(() => setBoard([]));
  }, [team.game]);

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Challenge abgeschlossen</p>
      <h1 className="cbt-title">Herzlichen Glückwunsch, geschafft!</h1>
      <p className="cbt-sub">
        Team {team.teamName} · Set {team.setLabel} · {game.title}
      </p>
      <div className="cbt-timer cbt-timer-final">{formatCountdown(team.remainingMs)}</div>
      <p className="cbt-sub">verbleibende Zeit – gespeichert in der Rangliste.</p>
      <div className="cbt-board">
        <h2 className="cbt-board-title">Rangliste · {game.title}</h2>
        {board === null ? (
          <p className="cbt-sub">Lade Ergebnisse…</p>
        ) : board.length === 0 ? (
          <p className="cbt-sub">Noch keine Ergebnisse.</p>
        ) : (
          <ol className="cbt-board-list">
            {board.map((e, i) => (
              <li
                key={e.id}
                className={e.id === team.id ? 'cbt-board-me' : ''}
              >
                <span className="cbt-board-rank">#{i + 1}</span>
                <span className="cbt-board-name">
                  {e.teamName} · {e.setLabel}
                </span>
                <span className="cbt-board-time">{formatCountdown(e.remainingMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <button className="cbt-btn cbt-btn-ghost" onClick={onRestart}>
        Neues Team registrieren
      </button>
    </div>
  );
}

/* ============================================================
   Spiel-App (pro QR-Code / Spiel)
   ============================================================ */

function GameApp({ gameId }) {
  const game = GAMES[gameId];
  const [team, setTeam] = useState(null);
  const [stage, setStage] = useState('loading');

  /* Reconnect: gespeicherte Team-ID laden */
  useEffect(() => {
    const savedId = localStorage.getItem(`cbt-team-${gameId}`);
    if (!savedId) {
      setStage('register');
      return;
    }
    api(`/team/${savedId}`)
      .then((t) => {
        setTeam(t);
        if (t.status === 'finished') setStage('finished');
        else if (t.status === 'playing') setStage('playing');
        else setStage('briefing');
      })
      .catch(() => {
        localStorage.removeItem(`cbt-team-${gameId}`);
        setStage('register');
      });
  }, [gameId]);

  if (!game) return <NotFound />;
  if (stage === 'loading') {
    return (
      <div className="cbt-card">
        <p className="cbt-sub">Lade…</p>
      </div>
    );
  }

  const saveTeam = (t) => localStorage.setItem(`cbt-team-${gameId}`, t.id);

  const restart = () => {
    localStorage.removeItem(`cbt-team-${gameId}`);
    setTeam(null);
    setStage('register');
  };

  return (
    <>
      {stage === 'register' && (
        <Register
          game={game}
          gameId={gameId}
          onRegistered={(t) => {
            saveTeam(t);
            setTeam(t);
            setStage('briefing');
          }}
        />
      )}
      {stage === 'briefing' && (
        <Briefing game={game} onDone={() => setStage('ready')} />
      )}
      {stage === 'ready' && (
        <Ready
          game={game}
          onYes={() => setStage('question')}
          onNo={() => setStage('briefing')}
        />
      )}
      {stage === 'question' && team && (
        <Question
          game={game}
          team={team}
          onSolved={(t) => {
            setTeam(t);
            setStage('playing');
          }}
        />
      )}
      {stage === 'playing' && team && (
        <Playing
          team={team}
          onFinish={(t) => {
            setTeam(t);
            setStage('finished');
          }}
        />
      )}
      {stage === 'finished' && team && (
        <Finished game={game} team={team} onRestart={restart} />
      )}
    </>
  );
}

/* ============================================================
   Operator-Dashboard
   ============================================================ */

function Operator() {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () =>
      api('/operator')
        .then((d) => active && setTeams(d))
        .catch((e) => active && setError(e.message));
    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const reset = async (id, name) => {
    if (!window.confirm(`Team "${name}" wirklich zurücksetzen? Das Set wird wieder frei.`)) return;
    try {
      await api(`/team/${id}`, { method: 'DELETE' });
    } catch (e) {
      setError(e.message);
    }
  };

  const statusLabel = { registered: 'registriert', playing: 'läuft', finished: 'beendet' };

  return (
    <div className="cbt-card cbt-card-wide">
      <p className="cbt-eyebrow">Operator-Dashboard</p>
      <h1 className="cbt-title">Alle Teams</h1>
      <p className="cbt-sub">Aktualisiert automatisch alle 5 Sekunden.</p>
      {error && <p className="cbt-error">{error}</p>}
      {teams === null ? (
        <p className="cbt-sub">Lade Teams…</p>
      ) : teams.length === 0 ? (
        <p className="cbt-sub">Noch keine Teams registriert.</p>
      ) : (
        <div className="cbt-table-wrap">
          <table className="cbt-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Spiel</th>
                <th>Set</th>
                <th>Status</th>
                <th>Restzeit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className={t.status === 'playing' ? 'cbt-row-live' : ''}>
                  <td>{t.teamName}</td>
                  <td>{t.gameTitle}</td>
                  <td>{t.setLabel}</td>
                  <td>{statusLabel[t.status] || t.status}</td>
                  <td className="cbt-board-time">
                    {t.status === 'registered' ? '–' : formatCountdown(t.remainingMs)}
                  </td>
                  <td>
                    <button
                      className="cbt-btn cbt-btn-ghost cbt-btn-small"
                      onClick={() => reset(t.id, t.teamName)}
                    >
                      Zurücksetzen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Hoppla</p>
      <h1 className="cbt-title">Keine Challenge gefunden</h1>
      <p className="cbt-sub">
        Dieser QR-Code passt zu keiner Challenge Box. Bitte einen gültigen Code
        scannen.
      </p>
      <p className="cbt-sub cbt-sub-small">
        Spiele: <a href="#/vinci">Vinci</a> · <a href="#/zodiak">Zodiak</a> ·{' '}
        <a href="#/operator">Operator-Dashboard</a>
      </p>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  let screen;
  if (route === 'operator') screen = <Operator />;
  else if (GAMES[route]) screen = <GameApp gameId={route} />;
  else screen = <NotFound />;

  return (
    <div className="cbt-app">
      <style>{css}</style>
      {screen}
    </div>
  );
}

/* ---------- Styles (Challenge Box Games Look) ---------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap');

#root {
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.cbt-app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(182, 93, 0, 0.35), transparent),
    linear-gradient(160deg, #171717 0%, #1f1a15 60%, #171717 100%);
  font-family: 'Inter', system-ui, sans-serif;
  color: #f0f0f0;
}

.cbt-card {
  width: 100%;
  max-width: 640px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(222, 184, 135, 0.25);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: cbt-in 0.35s ease;
}

.cbt-card-wide { max-width: 960px; }

@keyframes cbt-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.cbt-eyebrow {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #deb887;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cbt-eyebrow-live { color: #ffbc7d; }

.cbt-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #b65d00;
  animation: cbt-pulse 1.2s ease-in-out infinite;
}

@keyframes cbt-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.35); }
}

.cbt-title {
  margin: 0 0 12px;
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: clamp(26px, 5vw, 38px);
  line-height: 1.15;
  color: #ffffff;
}

.cbt-sub {
  margin: 0 0 24px;
  color: #d8d2c8;
  font-size: 16px;
  line-height: 1.6;
}

.cbt-sub-small { font-size: 13px; color: #a89f92; margin-top: 16px; }
.cbt-sub-small a { color: #deb887; }

.cbt-swipe-number {
  font-family: 'Archivo Black', 'Inter', sans-serif;
  color: #b65d00;
  font-size: 20px;
  margin: 0 0 8px;
}

.cbt-swipe { animation: cbt-in 0.3s ease; }

.cbt-dots {
  display: flex;
  gap: 8px;
  margin: 4px 0 20px;
}

.cbt-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(222, 184, 135, 0.25);
  transition: background 0.2s ease;
}

.cbt-dots .cbt-dot-active { background: #b65d00; }

.cbt-form { display: flex; flex-direction: column; gap: 18px; }

.cbt-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #deb887;
}

.cbt-label input, .cbt-label select {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  color: #f0f0f0;
  background: #221d18;
  border: 1px solid rgba(222, 184, 135, 0.35);
  border-radius: 10px;
  padding: 13px 16px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  appearance: none;
}

.cbt-label select {
  background-image: linear-gradient(45deg, transparent 50%, #deb887 50%),
    linear-gradient(135deg, #deb887 50%, transparent 50%);
  background-position: calc(100% - 20px) 50%, calc(100% - 14px) 50%;
  background-size: 6px 6px;
  background-repeat: no-repeat;
  cursor: pointer;
}

.cbt-label input:focus, .cbt-label select:focus {
  border-color: #b65d00;
  box-shadow: 0 0 0 3px rgba(182, 93, 0, 0.25);
}

.cbt-label input.cbt-wrong, .cbt-label select.cbt-wrong { border-color: #cf2e2e; }

.cbt-shake { animation: cbt-shake 0.4s ease; }

@keyframes cbt-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-7px); }
  40% { transform: translateX(7px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

.cbt-error {
  margin: 0;
  color: #f78da7;
  font-size: 14px;
}

.cbt-btn {
  margin-top: 6px;
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: 16px;
  color: #171717;
  background: linear-gradient(180deg, #ffbc7d 0%, #b65d00 100%);
  border: none;
  border-radius: 999px;
  padding: 16px 32px;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.cbt-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(182, 93, 0, 0.45);
  filter: brightness(1.08);
}

.cbt-btn:active { transform: translateY(0); }

.cbt-btn:disabled { opacity: 0.6; cursor: wait; }

.cbt-btn-ghost {
  background: transparent;
  color: #deb887;
  border: 1px solid rgba(222, 184, 135, 0.45);
}

.cbt-btn-small { padding: 8px 16px; font-size: 12px; margin-top: 0; }

.cbt-btn-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.cbt-btn-row .cbt-btn { flex: 1; min-width: 140px; }

.cbt-timer {
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: clamp(56px, 14vw, 110px);
  text-align: center;
  color: #ffd39b;
  text-shadow: 0 0 40px rgba(182, 93, 0, 0.55);
  margin: 12px 0 4px;
  font-variant-numeric: tabular-nums;
}

.cbt-timer-low { color: #f78da7; text-shadow: 0 0 40px rgba(207, 46, 46, 0.5); }

.cbt-timer-final { color: #ffbc7d; font-size: clamp(44px, 10vw, 84px); }

.cbt-board {
  margin: 0 0 24px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(222, 184, 135, 0.2);
  border-radius: 14px;
  padding: 20px 22px;
}

.cbt-board-title {
  margin: 0 0 14px;
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: 18px;
  color: #deb887;
}

.cbt-board-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cbt-board-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.cbt-board-list li.cbt-board-me {
  background: rgba(182, 93, 0, 0.18);
  border: 1px solid rgba(182, 93, 0, 0.5);
}

.cbt-board-rank {
  font-family: 'Archivo Black', 'Inter', sans-serif;
  color: #b65d00;
  min-width: 34px;
}

.cbt-board-name {
  flex: 1;
  font-weight: 600;
  font-size: 15px;
}

.cbt-board-time {
  font-variant-numeric: tabular-nums;
  color: #ffd39b;
  font-weight: 700;
}

.cbt-table-wrap { overflow-x: auto; }

.cbt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.cbt-table th {
  text-align: left;
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #deb887;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(222, 184, 135, 0.3);
}

.cbt-table td {
  padding: 12px;
  border-bottom: 1px solid rgba(222, 184, 135, 0.12);
}

.cbt-row-live { background: rgba(182, 93, 0, 0.08); }

@media (max-width: 480px) {
  .cbt-card { padding: 28px 20px; }
}
`;
