// Clock used for task timestamps. When sync is on, it follows the server's
// clock (offset learned from each sync response), so a device whose clock runs
// fast or slow doesn't win or lose last-write-wins comparisons unfairly.
const KEY = "todo-clock-offset"
const MAX_OFFSET = 365 * 24 * 60 * 60 * 1000

let offset = 0
try {
  const saved = Number(globalThis.localStorage?.getItem(KEY))
  if (Number.isFinite(saved) && Math.abs(saved) < MAX_OFFSET) offset = saved
} catch {
  // no storage (server, private mode): offset stays 0
}

export const clockNow = () => Math.round(Date.now() + offset)

/** Learn the offset from a response's serverTime, assuming it was read halfway through the request. */
export const syncClock = (serverTime, sentAt, receivedAt = Date.now()) => {
  if (!Number.isFinite(serverTime)) return
  const next = serverTime - (sentAt + receivedAt) / 2
  if (Math.abs(next) >= MAX_OFFSET) return
  offset = next
  try {
    globalThis.localStorage?.setItem(KEY, String(Math.round(next)))
  } catch {
    // ignore
  }
}
