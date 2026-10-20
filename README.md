# ✅ Todo — Stay on track

A clean todo app built with React, the Context API and Tailwind CSS.

**🔗 Live:** https://todo-chi-vert.vercel.app

## ✨ Features

- Add, complete, edit and delete todos
- **Inline editing**: double-click or the edit button; Enter saves, Escape cancels
- **Filters**: All / Active / Done, with counts
- Progress bar and "x of y done" summary
- **Clear completed** in one click
- Todos are **saved in your browser** (localStorage), so they survive a reload
- Empty states, keyboard and screen-reader friendly controls, responsive layout

## 🛠 Tech Stack

React 18 · Context API · Vite · Tailwind CSS

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
├── App.jsx                 # state, filters, localStorage sync
├── contexts/TodoContext.js # todo context + useTodo hook
└── components/
    ├── TodoForm.jsx        # add a todo
    ├── TodoItem.jsx        # one todo: toggle, edit, delete
    └── Icons.jsx
```

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
