// Recurring tasks: daily, weekly on chosen weekdays, or monthly on a day of the month.
// Dates are local "YYYY-MM-DD" strings, the same format the due-date field uses.

export const REPEAT_FREQS = ["daily", "weekly", "monthly"]
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const SERIES_RE = /^[A-Za-z0-9_.:@-]{1,80}$/

const parse = (iso) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const format = (date) => {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const addDays = (iso, n) => {
  const date = parse(iso)
  date.setDate(date.getDate() + n)
  return format(date)
}
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

/** Clean up a saved/imported repeat rule. Returns null when there is no valid rule. */
export const normalizeRepeat = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !REPEAT_FREQS.includes(raw.freq)) return null
  const rule = { freq: raw.freq }
  if (raw.freq === "weekly") {
    const days = Array.isArray(raw.days) ? raw.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : []
    if (!days.length) return null
    rule.days = [...new Set(days)].sort((a, b) => a - b)
  }
  if (raw.freq === "monthly" && Number.isInteger(raw.day) && raw.day >= 1 && raw.day <= 31) rule.day = raw.day
  if (typeof raw.series === "string" && SERIES_RE.test(raw.series)) rule.series = raw.series
  return rule
}

/** First date strictly after `fromISO` that matches the rule. */
export const nextDue = (rule, fromISO) => {
  if (rule.freq === "daily") return addDays(fromISO, 1)
  if (rule.freq === "weekly") {
    for (let i = 1; i <= 7; i++) {
      const candidate = addDays(fromISO, i)
      if (rule.days.includes(parse(candidate).getDay())) return candidate
    }
    return addDays(fromISO, 7)
  }
  // monthly: keep the anchor day (e.g. the 31st), clamped to short months.
  const from = parse(fromISO)
  const anchor = rule.day || from.getDate()
  const sameMonth = new Date(from.getFullYear(), from.getMonth(), Math.min(anchor, daysInMonth(from.getFullYear(), from.getMonth())))
  if (format(sameMonth) > fromISO) return format(sameMonth)
  const y = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear()
  const m = (from.getMonth() + 1) % 12
  return format(new Date(y, m, Math.min(anchor, daysInMonth(y, m))))
}

/** First matching date on or after `todayISO`; used when a repeating task has no due date. */
export const firstDue = (rule, todayISO) => nextDue(rule, addDays(todayISO, -1))

/**
 * The next occurrence created when a repeating task is completed.
 * Its id is derived from the series and date, so two devices completing the
 * same task offline create the same next task instead of a duplicate.
 */
export const nextOccurrence = (todo, todayISO, now = Date.now()) => {
  const series = todo.repeat.series || String(todo.id)
  const base = todo.due && todo.due > todayISO ? todo.due : todayISO
  const due = nextDue(todo.repeat, base)
  return {
    id: `${series}~${due}`,
    todo: todo.todo,
    completed: false,
    due,
    priority: todo.priority,
    repeat: { ...todo.repeat, series },
    createdAt: now,
    updatedAt: now,
  }
}

/** Repeat rule for a task, filling in the monthly anchor day from its due date. */
export const withAnchor = (rule, due) => {
  if (!rule) return null
  if (rule.freq !== "monthly") {
    const rest = { ...rule }
    delete rest.day
    return rest
  }
  return due ? { ...rule, day: parse(due).getDate() } : rule
}

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Short human label, e.g. "Daily", "Weekdays", "Mon, Thu", "Monthly on the 15th". */
export const repeatLabel = (rule) => {
  if (!rule) return ""
  if (rule.freq === "daily") return "Daily"
  if (rule.freq === "monthly") return rule.day ? `Monthly on the ${ordinal(rule.day)}` : "Monthly"
  const key = rule.days.join("")
  if (key === "0123456") return "Every day"
  if (key === "12345") return "Weekdays"
  if (key === "06") return "Weekends"
  return rule.days.map((d) => WEEKDAYS[d]).join(", ")
}
