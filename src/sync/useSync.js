import { useCallback, useEffect, useRef, useState } from "react"
import { generateCode, normalizeCode } from "./code.js"
import { normalizeRecord, toRecords } from "./records.js"

// Offline-first sync: the app always reads and writes localStorage; when a sync
// code is set, the full record list is pushed to /api/sync and the merged list
// that comes back is folded into local state. Triggers: page load, local edits
// (debounced), window focus / tab becoming visible, and coming back online.

const CODE_KEY = "todo-sync-code"
const LAST_KEY = "todo-sync-last"
const DEBOUNCE_MS = 1500
const MIN_FOCUS_GAP_MS = 5000

const read = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked: sync still works for this visit.
  }
}

class SyncError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function pushAndPull(code, records, create) {
  let res
  try {
    res = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${code}` },
      body: JSON.stringify({ records, create }),
    })
  } catch {
    throw new SyncError("Can't reach the sync server. Changes are saved here and will sync later.", 0)
  }
  const body = await res.json().catch(() => null)
  if (res.status === 404) throw new SyncError("That sync code wasn't found. Check it and try again.", 404)
  if (res.status === 429) throw new SyncError("Too many sync requests. Trying again shortly.", 429)
  if (res.status === 413) throw new SyncError(body?.error || "Too much data to sync.", 413)
  if (!res.ok || !Array.isArray(body?.records)) throw new SyncError("Sync failed. Your tasks are safe on this device.", res.status)
  return body.records.map(normalizeRecord).filter(Boolean)
}

/**
 * @param data      current { todos, tombstones }
 * @param localRev  bumps on every local edit (not on remote updates)
 * @param onRemote  (records) => void, merges server records into state
 */
export default function useSync({ data, localRev, onRemote }) {
  const [code, setCode] = useState(() => normalizeCode(read(CODE_KEY) || ""))
  const [status, setStatus] = useState("idle") // idle | syncing | offline | error
  const [error, setError] = useState("")
  const [lastSynced, setLastSynced] = useState(() => Number(read(LAST_KEY)) || null)

  const dataRef = useRef(data)
  dataRef.current = data
  const onRemoteRef = useRef(onRemote)
  onRemoteRef.current = onRemote
  const codeRef = useRef(code)
  codeRef.current = code
  const inFlight = useRef(false)
  const queued = useRef(false)
  const lastAttempt = useRef(0)

  const run = useCallback(async (syncCode, create) => {
    lastAttempt.current = Date.now()
    setStatus("syncing")
    try {
      const records = await pushAndPull(syncCode, toRecords(dataRef.current), create)
      onRemoteRef.current(records)
      const now = Date.now()
      setLastSynced(now)
      write(LAST_KEY, String(now))
      setStatus("idle")
      setError("")
      return true
    } catch (err) {
      const offline = err.status === 0 && typeof navigator !== "undefined" && navigator.onLine === false
      setStatus(offline ? "offline" : "error")
      setError(offline ? "" : err.message)
      throw err
    }
  }, [])

  /** Sync with the saved code; overlapping calls are coalesced into one follow-up. */
  const syncNow = useCallback(async () => {
    const current = codeRef.current
    if (!current) return
    if (inFlight.current) {
      queued.current = true
      return
    }
    inFlight.current = true
    try {
      await run(current, false)
    } catch (err) {
      // Another device removed the synced data: stop syncing here, keep local tasks.
      if (err.status === 404 && codeRef.current === current) {
        setCode(null)
        write(CODE_KEY, null)
        setError("Sync was turned off because the synced data was deleted on another device.")
        setStatus("idle")
      }
    } finally {
      inFlight.current = false
      if (queued.current) {
        queued.current = false
        syncNow()
      }
    }
  }, [run])

  const connect = useCallback(async (syncCode, create) => {
    inFlight.current = true
    try {
      await run(syncCode, create)
      write(CODE_KEY, syncCode)
      setCode(syncCode)
      return true
    } catch {
      return false
    } finally {
      inFlight.current = false
    }
  }, [run])

  /** Create a new sync code for this device's tasks. */
  const enable = useCallback(() => connect(generateCode(), true), [connect])

  /** Link this device to an existing code. Returns false (with `error` set) on failure. */
  const link = useCallback(async (input) => {
    const syncCode = normalizeCode(input)
    if (!syncCode) {
      setStatus("error")
      setError("That doesn't look like a sync code. It has 26 letters and numbers.")
      return false
    }
    return connect(syncCode, false)
  }, [connect])

  /** Stop syncing on this device. Tasks stay here and on the server. */
  const disconnect = useCallback(() => {
    write(CODE_KEY, null)
    write(LAST_KEY, null)
    setCode(null)
    setLastSynced(null)
    setStatus("idle")
    setError("")
  }, [])

  /** Delete this code's data from the server, then stop syncing. */
  const destroy = useCallback(async () => {
    const current = codeRef.current
    if (!current) return false
    try {
      const res = await fetch("/api/sync", { method: "DELETE", headers: { authorization: `Bearer ${current}` } })
      if (!res.ok && res.status !== 404) throw new Error()
      disconnect()
      return true
    } catch {
      setStatus("error")
      setError("Couldn't delete the synced data. Check your connection and try again.")
      return false
    }
  }, [disconnect])

  // On load (and whenever a code is set; enable/link have just synced, so skip those).
  useEffect(() => {
    if (code && Date.now() - lastAttempt.current > MIN_FOCUS_GAP_MS) syncNow()
  }, [code, syncNow])

  // After local edits, debounced.
  const firstRev = useRef(localRev)
  useEffect(() => {
    if (!code || localRev === firstRev.current) return undefined
    const timer = setTimeout(syncNow, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [code, localRev, syncNow])

  // On focus, when the tab becomes visible, and when the connection returns.
  useEffect(() => {
    if (!code) return undefined
    const onWake = () => {
      if (document.visibilityState === "hidden") return
      if (Date.now() - lastAttempt.current < MIN_FOCUS_GAP_MS) return
      syncNow()
    }
    const onOffline = () => setStatus("offline")
    window.addEventListener("focus", onWake)
    window.addEventListener("online", onWake)
    window.addEventListener("offline", onOffline)
    document.addEventListener("visibilitychange", onWake)
    return () => {
      window.removeEventListener("focus", onWake)
      window.removeEventListener("online", onWake)
      window.removeEventListener("offline", onOffline)
      document.removeEventListener("visibilitychange", onWake)
    }
  }, [code, syncNow])

  return { code, status, error, lastSynced, syncNow, enable, link, disconnect, destroy, clearError: () => setError("") }
}
