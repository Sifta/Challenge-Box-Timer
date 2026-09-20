import { useEffect, useRef, useState } from 'react';

/* ============================================================
   CHALLENGE BOX TIMER
   ------------------------------------------------------------
   HOW IT WORKS
   - Each QR code encodes a URL like  https://<your-domain>/#/alpha
     (one QR code per box, each with its own puzzle + solution).
   - Scan -> team registration -> puzzle text -> answer starts
     the timer -> solution stops it -> team + time saved to the
     backend leaderboard.
   - Edit the BOXES object below to add/change boxes.
   ============================================================ */

const BOXES = {
  alpha: {
    title: 'Challenge Box Alpha',
    prompt:
      'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
    startAnswer: 'echo', // correct answer here starts the timer
    solution: '7', // word/number that stops the timer
  },
  bravo: {
    title: 'Challenge Box Bravo',
    prompt:
      'The more of me you take, the more you leave behind. What am I? When you know it, type the answer to begin.',
    startAnswer: 'footsteps',
    solution: '42',
  },
  charlie: {
    title: 'Challenge Box Charlie',
    prompt:
      'I have keys but open no locks. I have space but no room. You can enter, but you cannot go outside. What am I?',
    startAnswer: 'keyboard',
    solution: 'gold',
  },
};

// Backend base URL. In dev, the Vite proxy forwards /api to the
// Express server (see vite.config.js). If the backend is not
// reachable, results are stored locally in the browser instead.
const API = '/api';

/* ---------- helpers ---------- */

function getBoxIdFromHash() {
  const match = window.location.hash.match(/^#\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const tenths = String(Math.floor((ms % 1000) / 100));
  return `${minutes}:${seconds}.${tenths}`;
}

async function fetchLeaderboard(boxId) {
  try {
    const res = await fetch(`${API}/leaderboard/${boxId}`);
    if (!res.ok) throw new Error('backend unavailable');
    return await res.json();
  } catch {
    try {
      return JSON.parse(localStorage.getItem(`cbt-board-${boxId}`)) || [];
    } catch {
      return [];
    }
  }
}

async function saveResult(boxId, teamName, players, timeMs) {
  const entry = { teamName, players, timeMs, finishedAt: new Date().toISOString() };
  try {
    const res = await fetch(`${API}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxId, ...entry }),
    });
    if (!res.ok) throw new Error('backend unavailable');
  } catch {
    const key = `cbt-board-${boxId}`;
    const board = JSON.parse(localStorage.getItem(key) || '[]');
    board.push(entry);
    localStorage.setItem(key, JSON.stringify(board));
  }
}

/* ---------- screens ---------- */

function Register({ box, onConfirm }) {
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState('2');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Please choose a team name.');
      return;
    }
    const count = parseInt(players, 10);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setError('Player count must be between 1 and 50.');
      return;
    }
    onConfirm(teamName.trim(), count);
  };

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Team registration</p>
      <h1 className="cbt-title">{box.title}</h1>
      <p className="cbt-sub">
        Welcome, adventurers. Register your team to unlock your challenge.
      </p>
      <form onSubmit={submit} className="cbt-form">
        <label className="cbt-label">
          Team name
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. The Golden Explorers"
            maxLength={40}
            autoFocus
          />
        </label>
        <label className="cbt-label">
          How many people are playing?
          <input
            type="number"
            min="1"
            max="50"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          />
        </label>
        {error && <p className="cbt-error">{error}</p>}
        <button type="submit" className="cbt-btn">
          Confirm
        </button>
      </form>
    </div>
  );
}

function Riddle({ box, onStart }) {
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (normalize(answer) === normalize(box.startAnswer)) {
      onStart();
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Your challenge</p>
      <h1 className="cbt-title">{box.title}</h1>
      <p className="cbt-prompt">{box.prompt}</p>
      <form onSubmit={submit} className="cbt-form">
        <label className="cbt-label">
          Type your answer to start the timer
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            className={wrong ? 'cbt-shake cbt-wrong' : ''}
            autoFocus
          />
        </label>
        {wrong && <p className="cbt-error">Not quite — discuss and try again.</p>}
        <button type="submit" className="cbt-btn">
          Start the timer
        </button>
      </form>
    </div>
  );
}

function Running({ box, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 47);
    return () => clearInterval(id);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (normalize(answer) === normalize(box.solution)) {
      onStop(Date.now() - startRef.current);
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow cbt-eyebrow-live">
        <span className="cbt-dot" /> Timer running
      </p>
      <div className="cbt-timer" role="timer" aria-live="off">
        {formatTime(elapsed)}
      </div>
      <p className="cbt-sub">Solve the challenge. Enter the solution word or number.</p>
      <form onSubmit={submit} className="cbt-form">
        <label className="cbt-label">
          Solution
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Solution word or number..."
            className={wrong ? 'cbt-shake cbt-wrong' : ''}
            autoFocus
          />
        </label>
        {wrong && <p className="cbt-error">That is not the solution. Keep going!</p>}
        <button type="submit" className="cbt-btn">
          Stop the timer
        </button>
      </form>
    </div>
  );
}

function Finished({ box, teamName, timeMs, onRestart }) {
  const [board, setBoard] = useState(null);

  const load = async () => {
    const id = getBoxIdFromHash();
    const entries = await fetchLeaderboard(id);
    entries.sort((a, b) => a.timeMs - b.timeMs);
    setBoard(entries);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Challenge complete</p>
      <h1 className="cbt-title">Well done, {teamName}!</h1>
      <div className="cbt-timer cbt-timer-final">{formatTime(timeMs)}</div>
      <p className="cbt-sub">
        Your time has been saved to the leaderboard for {box.title}.
      </p>
      <div className="cbt-board">
        <h2 className="cbt-board-title">Leaderboard</h2>
        {board === null ? (
          <p className="cbt-sub">Loading results…</p>
        ) : board.length === 0 ? (
          <p className="cbt-sub">No results yet.</p>
        ) : (
          <ol className="cbt-board-list">
            {board.map((e, i) => (
              <li
                key={`${e.teamName}-${e.finishedAt}`}
                className={e.teamName === teamName ? 'cbt-board-me' : ''}
              >
                <span className="cbt-board-rank">#{i + 1}</span>
                <span className="cbt-board-name">
                  {e.teamName} ({e.players} {e.players === 1 ? 'player' : 'players'})
                </span>
                <span className="cbt-board-time">{formatTime(e.timeMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <button className="cbt-btn cbt-btn-ghost" onClick={onRestart}>
        Register a new team
      </button>
    </div>
  );
}

function NotFound() {
  return (
    <div className="cbt-card">
      <p className="cbt-eyebrow">Oops</p>
      <h1 className="cbt-title">No challenge found</h1>
      <p className="cbt-sub">
        This QR code does not match a Challenge Box. Scan a valid code to begin.
      </p>
      <p className="cbt-sub cbt-sub-small">
        Available boxes:{' '}
        {Object.keys(BOXES).map((id) => (
          <a key={id} href={`#/${id}`}>
            #/{id}
          </a>
        )).reduce((prev, curr) => [prev, ' · ', curr])}
      </p>
    </div>
  );
}

/* ---------- app ---------- */

export default function App() {
  const boxId = getBoxIdFromHash();
  const box = BOXES[boxId];
  const [stage, setStage] = useState(box ? 'register' : 'invalid');
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState(0);
  const [timeMs, setTimeMs] = useState(0);

  // Reset if the hash changes (another QR code scanned on same device).
  useEffect(() => {
    const onHashChange = () => {
      const id = getBoxIdFromHash();
      setStage(BOXES[id] ? 'register' : 'invalid');
      setTeamName('');
      setPlayers(0);
      setTimeMs(0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!box) return <div className="cbt-app"><NotFound /></div>;

  const handleStart = () => setStage('running');

  const handleStop = async (elapsed) => {
    setTimeMs(elapsed);
    setStage('done');
    await saveResult(boxId, teamName, players, elapsed);
  };

  const handleRestart = () => {
    setStage('register');
    setTeamName('');
    setPlayers(0);
    setTimeMs(0);
  };

  return (
    <div className="cbt-app">
      <style>{css}</style>
      {stage === 'register' && (
        <Register
          box={box}
          onConfirm={(name, count) => {
            setTeamName(name);
            setPlayers(count);
            setStage('riddle');
          }}
        />
      )}
      {stage === 'riddle' && <Riddle box={box} onStart={handleStart} />}
      {stage === 'running' && <Running box={box} onStop={handleStop} />}
      {stage === 'done' && (
        <Finished box={box} teamName={teamName} timeMs={timeMs} onRestart={handleRestart} />
      )}
    </div>
  );
}

/* ---------- styles (Challenge Box Games look) ---------- */

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

.cbt-sub-small { font-size: 14px; color: #a89f92; }
.cbt-sub-small a { color: #deb887; }

.cbt-prompt {
  margin: 8px 0 28px;
  font-size: 19px;
  line-height: 1.7;
  color: #ffd39b;
  border-left: 3px solid #b65d00;
  padding-left: 16px;
}

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

.cbt-label input {
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
}

.cbt-label input:focus {
  border-color: #b65d00;
  box-shadow: 0 0 0 3px rgba(182, 93, 0, 0.25);
}

.cbt-label input.cbt-wrong { border-color: #cf2e2e; }

.cbt-shake {
  animation: cbt-shake 0.4s ease;
}

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

.cbt-btn-ghost {
  background: transparent;
  color: #deb887;
  border: 1px solid rgba(222, 184, 135, 0.45);
}

.cbt-timer {
  font-family: 'Archivo Black', 'Inter', sans-serif;
  font-size: clamp(64px, 16vw, 120px);
  text-align: center;
  color: #ffd39b;
  text-shadow: 0 0 40px rgba(182, 93, 0, 0.55);
  margin: 12px 0 4px;
  font-variant-numeric: tabular-nums;
}

.cbt-timer-final { color: #ffbc7d; }

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

@media (max-width: 480px) {
  .cbt-card { padding: 28px 20px; }
  .cbt-prompt { font-size: 17px; }
}
`;
