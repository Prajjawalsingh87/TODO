import { normalizeRepeat } from "./recurrence.js"

export const PRIORITIES = ["low", "medium", "high"]
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
export const MAX_TEXT = 200

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** Task ids: UUIDs, old numeric ids, and "series~date" ids of repeat occurrences. */
export const ID_RE = /^[A-Za-z0-9_.:~@-]{1,120}$/

const isTimestamp = (n) => Number.isSafeInteger(n) && n >= 0

/** Local date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export const toISODate = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/**
 * Turn any saved or imported value into a valid todo, or null if it can't be used.
 * Older saves have no `due` or `priority`, so they get safe defaults.
 */
export const normalizeTodo = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const text = typeof raw.todo === "string" ? raw.todo.trim().slice(0, MAX_TEXT) : ""
  if (!text) return null
  const id = typeof raw.id === "string" || typeof raw.id === "number" ? String(raw.id) : null
  return {
    id: id !== null && ID_RE.test(id) ? id : null,
    todo: text,
    completed: raw.completed === true,
    due: isValidDate(raw.due) ? raw.due : "",
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : "medium",
    repeat: normalizeRepeat(raw.repeat),
    createdAt: isTimestamp(raw.createdAt) ? raw.createdAt : null,
    updatedAt: isTimestamp(raw.updatedAt) ? raw.updatedAt : 0,
  }
}

/** Timestamp for an edit: now, but always newer than the version it replaces. */
export const stamp = (prev, now = Date.now()) => Math.max(now, (prev?.updatedAt || 0) + 1)

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Read todos from localStorage text. Bad entries are dropped. */
export const loadSaved = (text, now = Date.now()) => {
  try {
    const saved = JSON.parse(text)
    if (!Array.isArray(saved)) return []
    // Older saves have no createdAt; keep their newest-first order.
    return saved.map(normalizeTodo).filter(Boolean)
      .map((t, i) => ({ ...t, id: t.id ?? newId(), createdAt: t.createdAt ?? now - i }))
  } catch {
    return []
  }
}

/**
 * Parse an imported JSON file and merge it into the current list.
 * Accepts an array of todos (our export format) or `{ todos: [...] }`.
 * Returns { todos, added, skipped } or throws an Error with a friendly message.
 */
export const mergeImport = (text, current, now = Date.now()) => {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("This file is not valid JSON.")
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.todos) ? data.todos : null
  if (!list) throw new Error("Expected a list of tasks, like the file from Export JSON.")
  if (list.length > 5000) throw new Error("This file has too many tasks (limit 5000).")

  const ids = new Set(current.map((t) => String(t.id)))
  const seenText = new Set(current.map((t) => t.todo.toLowerCase()))
  const incoming = []
  let skipped = 0
  let invalid = 0
  for (const raw of list) {
    const todo = normalizeTodo(raw)
    if (!todo) { skipped++; invalid++; continue }
    const duplicate = todo.id !== null ? ids.has(String(todo.id)) : seenText.has(todo.todo.toLowerCase())
    if (duplicate) { skipped++; continue }
    const id = todo.id ?? newId()
    ids.add(String(id))
    seenText.add(todo.todo.toLowerCase())
    // A fresh updatedAt makes imported tasks win over older copies (or deletions) when syncing.
    incoming.push({ ...todo, id, createdAt: todo.createdAt ?? now - incoming.length, updatedAt: now })
  }
  if (list.length && invalid === list.length) {
    throw new Error("No valid tasks found. Each task needs a \"todo\" text.")
  }
  return { todos: [...incoming, ...current], added: incoming.length, skipped }
}

/** "overdue" | "today" | "upcoming" | "none" for an unfinished task. */
export const dueGroup = (todo, today = toISODate()) => {
  if (!todo.due) return "none"
  if (todo.due < today) return "overdue"
  if (todo.due === today) return "today"
  return "upcoming"
}

export const GROUPS = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "none", label: "No due date" },
  { key: "done", label: "Done" },
]

export const SORTS = [
  { key: "added", label: "Newest first" },
  { key: "priority", label: "Priority" },
  { key: "due", label: "Due date" },
]

/** Stable sort; ties keep the original (newest first) order. */
export const sortTodos = (todos, sort) => {
  const indexed = todos.map((t, i) => [t, i])
  if (sort === "added") {
    indexed.sort(([a, ai], [b, bi]) => (b.createdAt || 0) - (a.createdAt || 0) || ai - bi)
    return indexed.map(([t]) => t)
  }
  const byDue = (a, b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99")
  const byPriority = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  indexed.sort(([a, ai], [b, bi]) => {
    const first = sort === "priority" ? byPriority(a, b) || byDue(a, b) : byDue(a, b) || byPriority(a, b)
    return first || ai - bi
  })
  return indexed.map(([t]) => t)
}

/** Split tasks into the GROUPS order, dropping empty groups. */
export const groupTodos = (todos, today = toISODate()) => {
  const buckets = Object.fromEntries(GROUPS.map((g) => [g.key, []]))
  for (const t of todos) buckets[t.completed ? "done" : dueGroup(t, today)].push(t)
  return GROUPS.map((g) => ({ ...g, items: buckets[g.key] })).filter((g) => g.items.length)
}

/** Short label for a due date, e.g. "Today", "Tomorrow", "3 days late", "Mon, Oct 26". */
export const dueLabel = (due, today = toISODate()) => {
  if (!due) return ""
  const [y, m, d] = due.split("-").map(Number)
  const [ty, tm, td] = today.split("-").map(Number)
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  if (days < 0) return `${-days} days late`
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", ...(y !== ty ? { year: "numeric" } : {}),
  })
}

/** Shared Tailwind classes for the small date/priority fields. */
export const fieldClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"

export const PRIORITY_STYLE = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
}

export const capitalize = (s) => s[0].toUpperCase() + s.slice(1)
