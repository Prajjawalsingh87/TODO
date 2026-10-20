# ✅ Todo — Stay on track

A clean todo app built with React, the Context API and Tailwind CSS.

**🔗 Live:** https://todo-chi-vert.vercel.app

## ✨ Features

- Add, complete, edit and delete todos
- **Inline editing**: double-click or the edit button; Enter saves, Escape cancels
- **Filters**: All / Active / Done, with counts
- Progress bar and "x of y done" summary
- **Clear completed** in one click
- **Due dates** with tasks grouped into Overdue / Today / Upcoming / No due date / Done, plus an overdue count
- **Priority** (low / medium / high) badges, and sorting by newest, priority or due date
- **Keyboard shortcuts**: `N` jumps to the new task box, `/` jumps to search
- **Search**, **Export JSON** and **Import JSON** (validated; duplicates and invalid entries are skipped)
- Todos are **saved in your browser** (localStorage), so they survive a reload
- **Installable & offline**: add it to your home screen or desktop with the **Install app** button; it keeps working without a connection
- **Light / dark theme**: follows your system by default, and the toggle in the top bar remembers your choice
- Empty states, keyboard and screen-reader friendly controls, responsive layout

## 🛠 Tech Stack

React 18 · Context API · Vite · Tailwind CSS · vite-plugin-pwa (Workbox)

## ▶️ Run locally

```bash
git clone https://github.com/Prajjawalsingh87/TODO.git
cd TODO
npm install
npm run dev        # http://localhost:5173
```

## 📂 Project structure

```
src/
├── App.jsx                 # state, filters, grouping, import/export, shortcuts
├── todoUtils.js            # validation, due-date groups, sorting, import merge
├── contexts/TodoContext.js # todo context + useTodo hook
└── components/
    ├── TodoForm.jsx        # add a todo
    ├── TodoItem.jsx        # one todo: toggle, edit, delete
    └── Icons.jsx
src/shell/                  # theme toggle + "Install app" button (top bar)
src/theme.css               # light/dark colour tokens used by tailwind.theme.js
```

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
