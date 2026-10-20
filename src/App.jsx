import { useState, useEffect, useMemo } from 'react'
import {TodoProvider} from './contexts'
import TodoForm from './components/TodoForm'
import TodoItem from './components/TodoItem'
import { ClipboardIcon } from './components/Icons'

const STORAGE_KEY = "todos"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
]

const loadTodos = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter(t => t && typeof t.todo === "string" && (typeof t.id === "number" || typeof t.id === "string") && typeof t.completed === "boolean") : []
  } catch {
    return []
  }
}

function App() {
  // Read storage once on first render so the save effect never wipes it.
  const [todos, setTodos] = useState(loadTodos)
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [storageError, setStorageError] = useState("")
  const exportTasks = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(todos, null, 2)], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url; link.download = "my-tasks.json"; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const addTodo = (todo) => {
    setTodos((prev) => [{id: crypto.randomUUID(), ...todo}, ...prev] )
  }

  const updateTodo = (id, todo) => {
    setTodos((prev) => prev.map((prevTodo) => (prevTodo.id === id ? todo : prevTodo )))
  }

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }

  const toggleComplete = (id) => {
    setTodos((prev) =>
    prev.map((prevTodo) =>
      prevTodo.id === id ? { ...prevTodo,
        completed: !prevTodo.completed } : prevTodo))
  }

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
      setStorageError("")
    } catch { setStorageError("Browser storage is unavailable. Export your tasks to keep a copy.") }
  }, [todos])

  const completedCount = todos.filter((t) => t.completed).length
  const activeCount = todos.length - completedCount
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0

  const visibleTodos = useMemo(() => {
    return todos.filter(t =>
      (filter === "all" || (filter === "active" ? !t.completed : t.completed)) &&
      t.todo.toLowerCase().includes(query.trim().toLowerCase()))
  }, [todos, filter, query])

  const counts = { all: todos.length, active: activeCount, completed: completedCount }

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })

  const emptyCopy = {
    all: { title: "Nothing here yet", text: "Add your first task above to get started." },
    active: { title: "All caught up", text: "You have no active tasks. Nice work!" },
    completed: { title: "No finished tasks", text: "Tasks you complete will show up here." },
  }[filter]

  return (
    <TodoProvider value={{todos, addTodo, updateTodo, deleteTodo, toggleComplete}}>
      <div className="min-h-screen bg-gradient-to-b from-brand-50 via-slate-100 to-slate-100 px-4 py-10 sm:py-16">
        <main className="mx-auto w-full max-w-xl">
          <header className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-600">{today}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">My Tasks</h1>
            </div>
            {todos.length > 0 && (
              <p className="shrink-0 text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{completedCount}</span> of {todos.length} done
              </p>
            )}
          </header>

          <section className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
            <TodoForm />
            <div className="studio-toolbar">
              <input className="studio-input" type="search" aria-label="Search tasks" placeholder="Find a task…" value={query} onChange={e => setQuery(e.target.value)} />
              <button className="studio-button" onClick={exportTasks} disabled={!todos.length}>Export JSON</button>
            </div>
            {storageError && <p className="studio-status" role="status">{storageError}</p>}

            {todos.length > 0 && (
              <div className="mt-5">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Completed tasks"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter todos">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {f.label}
                        <span className={`ml-1.5 text-xs ${filter === f.key ? "text-brand-600" : "text-slate-500"}`}>{counts[f.key]}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={clearCompleted}
                    disabled={completedCount === 0}
                    className="ml-auto rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Clear completed
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              {visibleTodos.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {visibleTodos.map((todo) => (
                    <li key={todo.id}>
                      <TodoItem todo={todo} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
                  <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <ClipboardIcon width={24} height={24} />
                  </span>
                  <p className="font-semibold text-slate-900">{query ? "No matching tasks" : emptyCopy.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{query ? "Try another search or change your filter." : emptyCopy.text}</p>
                </div>
              )}
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-slate-500">
            {activeCount > 0 ? `${activeCount} task${activeCount === 1 ? "" : "s"} left` : "Saved on this device"} · Double-click a task to edit
          </p>
        </main>
      </div>
    </TodoProvider>
  )
}

export default App
