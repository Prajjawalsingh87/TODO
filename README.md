# ✅ Todo — Stay on track

A clean todo app built with React, the Context API and Tailwind CSS.

**🔗 Live:** https://todo-chi-vert.vercel.app

## ✨ Features

- Add, complete, edit and delete todos
- **Inline editing**: double-click or the edit button; Enter saves, Escape cancels
- **Filters**: All / Active / Done, with counts
- Progress bar and "x of y done" summary
- **Clear completed** in one click
- **Due dates** with tasks grouped into Overdue / Today / Upcoming / No due date / Done; overdue tasks are highlighted and counted
- **Recurring tasks**: daily, weekly on chosen weekdays, or monthly; completing one schedules the next occurrence
- **Reminders** (opt-in): a browser notification for tasks due today
- **Sync across devices** with a private sync code: no account, no password
- **Priority** (low / medium / high) badges, and sorting by newest, priority or due date
- **Keyboard shortcuts**: `N` jumps to the new task box, `/` jumps to search
- **Search**, **Export JSON** and **Import JSON** (validated; duplicates and invalid entries are skipped; repeat rules and timestamps are kept, and imported tasks sync)
- Todos are **saved in your browser** (localStorage), so they survive a reload
- **Installable & offline**: add it to your home screen or desktop with the **Install app** button; it keeps working without a connection
- **Light / dark theme**: follows your system by default, and the toggle in the top bar remembers your choice
- Empty states, keyboard and screen-reader friendly controls, responsive layout

## 🛠 Tech Stack

React 18 · Context API · Vite · Tailwind CSS · vite-plugin-pwa (Workbox) · Vercel Functions · Neon Postgres · Vitest

## ▶️ Run locally

```bash
git clone https://github.com/Prajjawalsingh87/TODO.git
cd TODO
npm install
npm run dev        # http://localhost:5173 (the app; /api needs `vercel dev`)
npm test           # merge, recurrence and API tests (in-memory Postgres via PGlite)
```

To run the sync API locally, link the project and pull its environment
(`vercel link`, `vercel env pull .env.local`), then `vercel dev`. Never commit `.env*` files.

## 📂 Project structure

```
src/
├── App.jsx                 # state, filters, grouping, import/export, shortcuts
├── todoUtils.js            # validation, due-date groups, sorting, import merge
├── recurrence.js           # repeat rules and next-occurrence dates
├── useDueReminders.js      # opt-in "due today" notifications
├── sync/                   # sync codes, record merge (shared with the API), useSync hook
├── contexts/TodoContext.js # todo context + useTodo hook
└── components/
    ├── TodoForm.jsx        # add a todo
    ├── TodoItem.jsx        # one todo: toggle, edit, delete
    ├── RepeatPicker.jsx    # Never / Daily / Weekly (+ weekdays) / Monthly
    ├── SyncPanel.jsx       # enable/link sync, code + QR, reminders switch
    └── Icons.jsx
src/shell/                  # theme toggle + "Install app" button (top bar)
src/theme.css               # light/dark colour tokens used by tailwind.theme.js
api/sync.js                 # Vercel Function: POST (sync) / DELETE (remove synced data)
api/_lib/                   # handler, validation, rate limiting, Neon client
test/                       # Vitest suites
```

## 🔁 Recurring tasks

Pick **Repeat** when adding or editing a task: Daily, Weekly (choose one or more weekdays) or Monthly
(on the due date's day; the 31st falls back to the last day of shorter months). A repeating task always
has a due date (the first matching day if you don't pick one). Completing it creates the next occurrence:
after the due date if you finish early, or after today if it was overdue, so missed days don't pile up.
The next occurrence's id is derived from the series and date, so two devices completing the same task
offline produce one next task, not two.

## 🔔 Reminders

Turn on **Reminders** in the panel below your tasks. The browser asks for permission only then. While the
app is open (or installed and running), you get one notification per task due today, re-checked every
15 minutes and when you come back to the tab. There is no push server, so a closed app stays quiet.

## ☁️ Sync across devices (sync code)

1. Click **Enable sync**. The app creates a random 128-bit **sync code** (26 characters), shown with
   **Copy** and a **QR code**.
2. On another device, click **I have a code** and enter it, or scan the QR code (it opens the app with the
   code filled in). Tasks on both devices are merged.

How it works:

- The app stays **offline-first**: tasks live in `localStorage` and everything works without sync or a
  connection. Sync runs on load, ~1.5 s after a change, when the window regains focus or the tab becomes
  visible, and when the connection comes back.
- Each sync sends the device's full list to `POST /api/sync` and gets the merged list back. Merging is
  **last-write-wins per task** on `updatedAt`; deletes leave **tombstones** so they reach other devices;
  equal timestamps keep the server's copy so every device converges. The same merge code
  (`src/sync/records.js`) runs in the browser and the API.
- The code is the only credential. It is sent in the `Authorization` header over HTTPS and the server
  stores only `SHA-256("todo-sync:v1:" + code)`. Anyone with the code can read and change the list, so
  keep it private. **Stop syncing here** forgets the code on this device; **Delete synced data from
  server** removes everything stored for it (other linked devices then stop syncing and keep their copy).
- Abuse limits: 60 requests/minute and 10 new codes/hour per IP (counted in Postgres under a hashed
  IP), bodies up to 1 MB, up to 5,000 records per request and 10,000 per code, strict per-field
  validation, and `updatedAt` values more than 5 minutes in the future are clamped.

Storage: [Neon](https://neon.tech) Postgres (free tier, `sin1`) added with
`vercel integration add neon -m region=sin1`, which sets `DATABASE_URL` for the project. Tables
(`sync_spaces`, `sync_tasks`, `rate_limits`) are created on first use.

## 📲 Install & offline (PWA)

`vite-plugin-pwa` generates `manifest.webmanifest` and a Workbox service worker (`sw.js`) at build time.
The service worker precaches the built app, so it opens offline, and updates itself automatically
when a new version is deployed. The **Install app** button only appears when the browser offers
installation (the `beforeinstallprompt` event). Icons (`public/pwa-*.png`, maskable and Apple touch
icons) are rendered from `public/favicon.svg`. `vercel.json` serves `sw.js`, `registerSW.js` and the
manifest with `Cache-Control: no-cache` so updates are picked up promptly.

## 🌗 Theme

The app follows `prefers-color-scheme` until you pick a theme with the toggle; the choice is saved
in `localStorage` (`color-theme`). Dark-mode colours are CSS variables in `src/theme.css`, wired into
Tailwind by `tailwind.theme.js`, so the light design uses Tailwind's stock colours unchanged.

## 🚀 Deployment

Deployed on **Vercel**; every push to `main` deploys to production.


## October 2026 improvements

Search tasks across the current All / Active / Done filter. Export all tasks as JSON for a portable backup. Invalid saved entries are ignored, and storage failures display a message instead of crashing the app.


## Terminal verification and deployment

```bash
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Node.js 24 is used on Vercel. The production build is written to `dist/`.

```bash
vercel link --project todo
vercel deploy          # preview
vercel deploy --prod   # publish production
```

The local `.vercel/` link is ignored by Git. Deployment credentials belong in
the CLI's login session, never in this repository.
