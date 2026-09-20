/* ============================================================
   CHALLENGE BOX TIMER - backend
   ------------------------------------------------------------
   A tiny Express server that stores each team's result and
   serves the leaderboard per box.

   Setup (once):
     npm install express
     node server.js

   In development, add this to vite.config.js so the frontend's
   /api calls are forwarded here:

     export default defineConfig({
       plugins: [react()],
       server: {
         proxy: {
           '/api': 'http://localhost:3001',
         },
       },
     })

   Routes:
     POST /api/finish            { boxId, teamName, players, timeMs }
     GET  /api/leaderboard/:boxId   -> sorted list of results
   ============================================================ */

import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

/* Allow requests from the Vite dev server / hosted frontend */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function loadDb() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveDb(db) {
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

app.post('/api/finish', (req, res) => {
  const { boxId, teamName, players, timeMs } = req.body || {};

  if (typeof boxId !== 'string' || !boxId.trim()) {
    return res.status(400).json({ error: 'boxId is required' });
  }
  if (typeof teamName !== 'string' || !teamName.trim()) {
    return res.status(400).json({ error: 'teamName is required' });
  }
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    return res.status(400).json({ error: 'timeMs must be a positive number' });
  }

  const db = loadDb();
  if (!db[boxId]) db[boxId] = [];
  db[boxId].push({
    teamName: teamName.trim(),
    players: Number.isFinite(players) ? Math.round(players) : 0,
    timeMs: Math.round(timeMs),
    finishedAt: new Date().toISOString(),
  });
  saveDb(db);

  res.status(201).json({ ok: true });
});

app.get('/api/leaderboard/:boxId', (req, res) => {
  const db = loadDb();
  const entries = (db[req.params.boxId] || [])
    .slice()
    .sort((a, b) => a.timeMs - b.timeMs);
  res.json(entries);
});

app.listen(PORT, () => {
  console.log(`Challenge Box Timer backend listening on http://localhost:${PORT}`);
});
