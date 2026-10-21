import { useCallback, useEffect, useRef, useState } from "react"
import { toISODate } from "./todoUtils"

// Opt-in browser notifications for tasks due today. Nothing is requested until
// the user turns reminders on. Notifications fire while the app is open (or
// installed and running); there is no push server, so a closed app stays quiet.

const PREF_KEY = "todo-reminders"
const SEEN_KEY = "todo-reminders-seen"
const CHECK_EVERY_MS = 15 * 60 * 1000

const supported = () => typeof window !== "undefined" && "Notification" in window
const read = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

async function show(title, body) {
  const options = { body, icon: "/pwa-192x192.png", badge: "/pwa-64x64.png", tag: "todo-due-today" }
  try {
    // Android Chrome only allows notifications through the service worker.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return await reg.showNotification(title, options)
  } catch {
    // fall back below
  }
  new Notification(title, options)
}

export default function useDueReminders(todos) {
  const [permission, setPermission] = useState(() => (supported() ? Notification.permission : "unsupported"))
  const [wanted, setWanted] = useState(() => read(PREF_KEY) === "on")
  const enabled = wanted && permission === "granted"
  const todosRef = useRef(todos)
  todosRef.current = todos

  const enable = useCallback(async () => {
    if (!supported()) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === "granted") {
      write(PREF_KEY, "on")
      setWanted(true)
    }
  }, [])

  const disable = useCallback(() => {
    write(PREF_KEY, "off")
    setWanted(false)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    const check = () => {
      const today = toISODate()
      let seen = {}
      try {
        seen = JSON.parse(read(SEEN_KEY) || "{}")
      } catch {
        // start fresh
      }
      const already = new Set(seen.date === today ? seen.ids : [])
      const fresh = todosRef.current.filter((t) => !t.completed && t.due === today && !already.has(t.id))
      if (!fresh.length) return
      fresh.forEach((t) => already.add(t.id))
      write(SEEN_KEY, JSON.stringify({ date: today, ids: [...already] }))
      const title = fresh.length === 1 ? "Due today" : `${fresh.length} tasks due today`
      show(title, fresh.slice(0, 4).map((t) => t.todo).join("\n") + (fresh.length > 4 ? "\n…" : ""))
    }
    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    const onVisible = () => document.visibilityState === "visible" && check()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled])

  return { supported: permission !== "unsupported", permission, enabled, enable, disable }
}
