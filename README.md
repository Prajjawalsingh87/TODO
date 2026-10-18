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
