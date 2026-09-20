/* ============================================================
   CHALLENGE BOX TIMER - Backend
   Team-Registrierung, Zeitmessung & Operator-Dashboard
   ------------------------------------------------------------
   WICHTIG: Alle Lösungen (Start-Antworten und Code-Summen pro
   Set) liegen NUR hier auf dem Server und werden niemals an
   den Browser gesendet. Die Zeit wird serverseitig gemessen
   (startedAt-Zeitstempel), damit der Countdown auch bei
   ausgeschaltetem Display oder geschlossenem Browser korrekt
   weiterläuft und nach dem erneuten Öffnen fortgesetzt wird.

   Routen:
     GET    /api/games                    Spiel-Infos (ohne Lösungen)
     GET    /api/games/:gameId           freie / belegte Sets
     POST   /api/register                Team registrieren -> teamId
     GET    /api/team/:teamId            Team-Status + Restzeit (Reconnect)
     POST   /api/start                   Start-Antwort prüfen -> Countdown läuft
     POST   /api/finish                  Endcode (Summe) prüfen -> Spiel beendet
     GET    /api/operator                 alle Teams + Restzeit (Dashboard)
     DELETE /api/team/:teamId            Team zurücksetzen (Set frei geben)
     GET    /api/leaderboard/:gameId      Rangliste der beendeten Spiele
   ============================================================ */

import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3001;

/* ---------- SPIEL-KONFIGURATION ----------
   setSums = erwartete Summe der beiden Code-Teilstücke pro Set.
   Diese Platzhalter-Werte mit den echten Codes ersetzen! */

const GAMES = {
  vinci: {
    title: 'Vinci',
    durationMs: 120 * 60 * 1000, // 120 Minuten
    setPrefix: 'CH',
    setCount: 15,
    startAnswer: '1519', // Todesjahr des grossen Meisters
    setSums: {
      CH01: 495, CH02: 945, CH03: 378, CH04: 612, CH05: 834,
      CH06: 267, CH07: 759, CH08: 186, CH09: 543, CH10: 921,
      CH11: 468, CH12: 732, CH13: 279, CH14: 615, CH15: 873,
    },
  },
  zodiak: {
    title: 'Zodiak',
    durationMs: 90 * 60 * 1000, // 90 Minuten
    setPrefix: 'ZD',
    setCount: 12,
    startAnswer: '12', // Anzahl Tierkreiszeichen
    setSums: {
      ZD01: 357, ZD02: 714, ZD03: 168, ZD04: 825, ZD05: 483,
      ZD06: 936, ZD07: 291, ZD08: 654, ZD09: 519, ZD10: 747,
      ZD11: 382, ZD12: 864,
    },
  },
};

/* ---------- storage ---------- */

const app = express();
app.use(express.json());

/* CORS für Entwicklung (Vite) und Deployment */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function loadDb() {
  if (!existsSync(DATA_FILE)) return { teams: [] };
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { teams: [] };
  }
}

function saveDb(db) {
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function getGame(gameId) {
  return GAMES[gameId] || null;
}

function setLabel(game, set) {
  return `${game.setPrefix}${String(set).padStart(2, '0')}`;
}

function isSetTaken(db, gameId, set) {
  return db.teams.some(
    (t) => t.game === gameId && t.set === set && t.status !== 'finished',
  );
}

function remainingMs(team, game) {
  if (team.status === 'finished') return team.remainingMs;
  if (!team.startedAt) return game.durationMs;
  return Math.max(0, game.durationMs - (Date.now() - team.startedAt));
}

function publicTeam(team, game) {
  return {
    id: team.id,
    game: team.game,
    gameTitle: game.title,
    set: team.set,
    setLabel: setLabel(game, team.set),
    teamName: team.teamName,
    players: team.players,
    status: team.status, // registered | playing | finished
    startedAt: team.startedAt || null,
    finishedAt: team.finishedAt || null,
    durationMs: game.durationMs,
    remainingMs: remainingMs(team, game),
    elapsedMs: team.startedAt ? Date.now() - team.startedAt : 0,
  };
}

function normalize(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/* ---------- Spiel-Infos (ohne Lösungen) ---------- */

app.get('/api/games', (req, res) => {
  res.json(
    Object.entries(GAMES).map(([id, g]) => ({
      id,
      title: g.title,
      durationMs: g.durationMs,
      setCount: g.setCount,
      setPrefix: g.setPrefix,
    })),
  );
});

app.get('/api/games/:gameId', (req, res) => {
  const game = getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });

  const db = loadDb();
  const all = Array.from({ length: game.setCount }, (_, i) => setLabel(game, i + 1));
  const free = all.filter(
    (label) =>
      !db.teams.some((t) => t.game === req.params.gameId && setLabel(game, t.set) === label && t.status !== 'finished'),
  );
  res.json({ freeSets: free, totalSets: all.length });
});

/* ---------- Registrierung ---------- */

app.post('/api/register', (req, res) => {
  const { game: gameId, teamName, players, set } = req.body || {};
  const game = getGame(gameId);
  if (!game) return res.status(400).json({ error: 'Unbekanntes Spiel' });
  if (typeof teamName !== 'string' || !teamName.trim()) {
    return res.status(400).json({ error: 'Bitte Teamnamen eingeben' });
  }
  const setNum = Number(set);
  if (!Number.isInteger(setNum) || setNum < 1 || setNum > game.setCount) {
    return res.status(400).json({ error: 'Bitte Set-Nummer auswählen' });
  }

  const db = loadDb();
  if (isSetTaken(db, gameId, setNum)) {
    return res.status(409).json({ error: 'Dieses Set ist bereits belegt' });
  }

  const playerCount = Number(players);
  const team = {
    id: crypto.randomUUID(),
    game: gameId,
    set: setNum,
    teamName: teamName.trim(),
    players: Number.isInteger(playerCount) && playerCount >= 1 && playerCount <= 50 ? playerCount : null,
    status: 'registered',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    remainingMs: null,
  };
  db.teams.push(team);
  saveDb(db);
  res.status(201).json(publicTeam(team, game));
});

/* ---------- Team-Status (Reconnect) ---------- */

app.get('/api/team/:teamId', (req, res) => {
  const db = loadDb();
  const team = db.teams.find((t) => t.id === req.params.teamId);
  if (!team) return res.status(404).json({ error: 'Team nicht gefunden' });
  res.json(publicTeam(team, getGame(team.game)));
});

/* ---------- Spielstart ---------- */

app.post('/api/start', (req, res) => {
  const { teamId, answer } = req.body || {};
  const db = loadDb();
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) return res.status(404).json({ error: 'Team nicht gefunden' });

  const game = getGame(team.game);

  if (team.status === 'playing' || team.status === 'finished') {
    return res.json(publicTeam(team, game));
  }
  if (normalize(answer) !== normalize(game.startAnswer)) {
    return res.status(400).json({ error: 'Falsche Antwort' });
  }

  team.status = 'playing';
  team.startedAt = Date.now();
  saveDb(db);
  res.json(publicTeam(team, game));
});

/* ---------- Spielende ---------- */

app.post('/api/finish', (req, res) => {
  const { teamId, code } = req.body || {};
  const db = loadDb();
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) return res.status(404).json({ error: 'Team nicht gefunden' });

  const game = getGame(team.game);

  if (team.status === 'finished') {
    return res.json(publicTeam(team, game));
  }
  if (team.status !== 'playing') {
    return res.status(400).json({ error: 'Der Countdown läuft noch nicht' });
  }

  const expected = game.setSums[setLabel(game, team.set)];
  if (expected === undefined) {
    return res.status(500).json({ error: 'Kein Code für dieses Set hinterlegt' });
  }
  if (Number(String(code).trim()) !== expected) {
    return res.status(400).json({ error: 'Falscher Code' });
  }

  const remaining = remainingMs(team, game);
  team.status = 'finished';
  team.finishedAt = new Date().toISOString();
  team.remainingMs = remaining;
  saveDb(db);
  res.json(publicTeam(team, game));
});

/* ---------- Operator-Dashboard ---------- */

app.get('/api/operator', (req, res) => {
  const db = loadDb();
  const teams = db.teams.map((t) => publicTeam(t, getGame(t.game)));
  // laufende zuerst (nach Restzeit), dann registrierte, dann beendete
  const rank = { playing: 0, registered: 1, finished: 2 };
  teams.sort(
    (a, b) => rank[a.status] - rank[b.status] || a.remainingMs - b.remainingMs,
  );
  res.json(teams);
});

/* ---------- Team zurücksetzen (Set frei geben) ---------- */

app.delete('/api/team/:teamId', (req, res) => {
  const db = loadDb();
  const idx = db.teams.findIndex((t) => t.id === req.params.teamId);
  if (idx === -1) return res.status(404).json({ error: 'Team nicht gefunden' });
  db.teams.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

/* ---------- Rangliste ---------- */

app.get('/api/leaderboard/:gameId', (req, res) => {
  const game = getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  const db = loadDb();
  const teams = db.teams
    .filter((t) => t.game === req.params.gameId && t.status === 'finished')
    .map((t) => publicTeam(t, game))
    .sort((a, b) => b.remainingMs - a.remainingMs); // meiste Restzeit = beste Zeit
  res.json(teams);
});

app.listen(PORT, () => {
  console.log(`Challenge Box Timer backend listening on http://localhost:${PORT}`);
});
