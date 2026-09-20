# Challenge Box Timer

Web-based timer for Challenge Box games. Each Challenge Box has its own QR code; when a team scans it, they register, solve a riddle to start the timer, and enter a solution to stop it. Team names and times are saved to a shared leaderboard.

## How it works

1. **Scan** — each QR code points to `https://<your-domain>/#/<box-id>` (e.g. `/#/alpha`).
2. **Register** — the team enters a team name and the number of players.
3. **Start** — the box's riddle is shown; typing the correct answer starts the timer.
4. **Solve** — while the timer runs, the team enters the solution word/number. The correct answer stops the clock.
5. **Leaderboard** — the team name and time are saved to the backend and ranked against other teams.

Boxes (riddle, start answer, solution) are defined in the `BOXES` object at the top of `src/App.jsx`. Add or edit boxes there — no other changes needed.

## Tech stack

- **Frontend**: React + Vite, styled after [challengeboxgames.ch](https://challengeboxgames.ch/)
- **Backend**: Express (Node.js) storing results in `data.json`

## Getting started

```bash
# install dependencies
npm install

# terminal 1 — start the backend (results API on port 3001)
npm run server

# terminal 2 — start the frontend dev server
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies `/api` calls to the backend (see `vite.config.js`).

If the backend is not running, the app falls back to saving results in the browser's local storage, so the timer still works for testing.

## Generating QR codes

Point any QR code generator at the box URLs, one per box:

- `https://<your-domain>/#/alpha`
- `https://<your-domain>/#/bravo`
- `https://<your-domain>/#/charlie`

## Scripts

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start the frontend dev server         |
| `npm run server`  | Start the Express backend on port 3001 |
| `npm run build`   | Build the frontend for production     |
| `npm run preview` | Preview the production build          |
| `npm run lint`    | Lint the code with ESLint             |

## License

[MIT](LICENSE)
