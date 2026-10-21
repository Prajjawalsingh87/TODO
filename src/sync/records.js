// Sync data model shared by the browser and the /api/sync function.
//
// A "record" is either a task or a tombstone ({ id, deleted: true, updatedAt })
// left behind by a delete. Merging is last-write-wins per id on updatedAt; on a
// tie the remote (server) copy wins, which matches the server, so every device
// converges on the same value.
import { ID_RE, normalizeTodo } from "../todoUtils.js"

export const MAX_RECORDS = 5000
export const MAX_BODY_BYTES = 1024 * 1024

/** Validate one record from the network. Returns a clean record or null. */
export const normalizeRecord = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) return null
  if (!Number.isSafeInteger(raw.updatedAt) || raw.updatedAt < 0) return null
  if (raw.deleted === true) return { id: raw.id, deleted: true, updatedAt: raw.updatedAt }
  const todo = normalizeTodo(raw)
  if (!todo || todo.id !== raw.id) return null
  return { ...todo, createdAt: todo.createdAt ?? 0 }
}

/** App state ({ todos, tombstones: { id: deletedAt } }) to a flat record list. */
export const toRecords = ({ todos, tombstones }) => [
  ...todos.map((t) => ({ ...t, updatedAt: t.updatedAt || 0 })),
  ...Object.entries(tombstones).map(([id, updatedAt]) => ({ id, deleted: true, updatedAt })),
]

/** Records back to app state; live tasks newest first. */
export const fromRecords = (records) => {
  const todos = []
  const tombstones = {}
  for (const r of records) {
    if (r.deleted) tombstones[r.id] = r.updatedAt
    else todos.push(r)
  }
  todos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { todos, tombstones }
}

/** Should `incoming` replace `current`? Ties go to `incoming` when `winTies` is set. */
export const wins = (incoming, current, winTies = false) =>
  !current || incoming.updatedAt > current.updatedAt || (winTies && incoming.updatedAt === current.updatedAt)

/** Last-write-wins merge of two record lists. Remote wins ties. */
export const mergeRecords = (local, remote) => {
  const byId = new Map()
  for (const r of local) if (wins(r, byId.get(r.id))) byId.set(r.id, r)
  for (const r of remote) if (wins(r, byId.get(r.id), true)) byId.set(r.id, r)
  return [...byId.values()]
}

/** Merge remote records into app state; returns `state` itself when nothing changed. */
export const applyRemote = (state, remote) => {
  const next = fromRecords(mergeRecords(toRecords(state), remote))
  return fingerprint(next) === fingerprint(state) ? state : next
}

const FIELDS = ["id", "todo", "completed", "due", "priority", "repeat", "createdAt", "updatedAt"]
const sortedKeys = (obj) => (obj && typeof obj === "object" ? Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]])) : obj)

/** Order-independent summary of app state, for cheap "did anything change?" checks. */
export const fingerprint = ({ todos, tombstones }) =>
  JSON.stringify([
    todos.map((t) => FIELDS.map((f) => (f === "repeat" ? sortedKeys(t.repeat) : t[f] ?? null))).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    Object.entries(tombstones).sort(([a], [b]) => (a < b ? -1 : 1)),
  ])
