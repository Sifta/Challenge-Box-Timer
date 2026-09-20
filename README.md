# Challenge Box Timer

Web-App für Challenge Box Games: Team-Registrierung per QR-Code, digitales Briefing, servergestützter Countdown und Operator-Dashboard. Die Benutzeroberfläche ist auf Deutsch, im Look von [challengeboxgames.ch](https://challengeboxgames.ch/).

## Ablauf (Spielerseite)

1. **QR-Code scannen** — jeder QR-Code zeigt auf `https://<domain>/#/vinci` oder `https://<domain>/#/zodiak`.
2. **Registrierung** — Teamname + Set-Nummer (z. B. CH01–CH15) aus einer Dropdown-Liste. Bereits belegte Sets werden ausgeblendet, Doppelnennungen werden serverseitig verhindert.
3. **Digitales Briefing** — wischbare Infoseiten (iPad/AR, Manuskript, allgemeine Hinweise).
4. **«Bereit, die Challenge anzunehmen?»** — mit Ja geht es zur ersten Frage.
5. **Startfrage** — z. B. «Wie lautet das Todesjahr des grossen Meisters?» (Antwort: 1519). Erst die richtige Antwort startet den Countdown (Vinci: 120 Min, Zodiak: 90 Min) — so öffnet kein Team die erste Box, ohne dass die Zeit läuft.
6. **Während des Spiels** — unter dem Countdown steht dauerhaft das Eingabefeld für den finalen Code (Summe der beiden Code-Teile, korreliert mit der Set-Nummer).
7. **Spielende** — richtige Summe stoppt die Zeit. Erfolgsmeldung + Rangliste.

## Reconnect / Display aus

Der Countdown wird **serverseitig** gemessen (Zeitstempel beim Start). Display ausschalten, Browser schliessen oder die Seite neu laden beeinträchtigt die Zeit nicht — beim erneuten Öffnen wird der verbleibende Countdown vom Server geladen (Team-ID liegt im lokalen Speicher des Geräts). Während des Spiels synchronisiert die App zusätzlich alle 15 Sekunden und beim Aufwecken des Displays.

## Operator-Dashboard

`https://<domain>/#/operator` — Übersicht aller Teams (Teamname, Spiel, Set, Status, Restzeit), aktualisiert alle 5 Sekunden, inklusive Zurücksetzen von Teams (gibt ein Set wieder frei).

## Sicherheit der Lösungen

Start-Antworten und die Code-Summen pro Set liegen **ausschliesslich in `server.js`** (`GAMES`-Objekt, `startAnswer` und `setSums`) und werden nie an den Browser gesendet. Die App prüft jede Antwort serverseitig.

Die dort hinterlegten Werte sind Platzhalter und müssen mit den echten Codes ersetzt werden.

## Setup

```bash
npm install

# Terminal 1 — Backend (API auf Port 3001)
npm run server

# Terminal 2 — Frontend (Dev-Server)
npm run dev
```

Die Results werden in `data.json` gespeichert (liegt in `.gitignore`).

## QR-Codes generieren

Pro Spiel ein QR-Code auf die App-URL:

- `https://<domain>/#/vinci`
- `https://<domain>/#/zodiak`

## Skripte

| Befehl          | Beschreibung                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Frontend-Dev-Server starten               |
| `npm run server`| Express-Backend auf Port 3001 starten     |
| `npm run build` | Produktions-Build erstellen               |
| `npm run lint`  | Code mit ESLint prüfen                    |

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Express (Node.js), Datenspeicher `data.json`

## License

[MIT](LICENSE)
