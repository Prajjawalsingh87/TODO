import { useEffect, useState } from 'react'
import { formatCode } from '../sync/code'
import { BellIcon, CloudIcon, CopyIcon } from './Icons'

const ago = (time, now) => {
  const s = Math.round((now - time) / 1000)
  if (s < 45) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const STATUS_DOT = {
  idle: "bg-emerald-500",
  syncing: "bg-amber-400 animate-pulse",
  offline: "bg-slate-400",
  error: "bg-rose-500",
}

function QrCode({ text }) {
  const [src, setSrc] = useState("")
  useEffect(() => {
    let alive = true
    // Loaded on demand so the QR library stays out of the main bundle.
    import('qrcode')
      .then((QR) => QR.toDataURL(text, { margin: 1, width: 192, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""))
    return () => { alive = false }
  }, [text])
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {src ? (
        <img src={src} width={192} height={192} alt="QR code that links another device to this sync code" className="rounded-lg" />
      ) : (
        <div className="h-48 w-48 animate-pulse rounded-lg bg-slate-200" aria-hidden="true" />
      )}
      <p className="text-center text-xs text-slate-500">Scan with your phone&apos;s camera to open the app and link it.</p>
    </div>
  )
}

const btn = "studio-button disabled:opacity-50"

function SyncPanel({ sync, reminders, pendingCode, onPendingHandled }) {
  const [mode, setMode] = useState(null) // null | "link"
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => setNow(Date.now()), [sync.lastSynced])

  // Opened from a scanned QR link (#sync=CODE): prefill the link form.
  useEffect(() => {
    if (!pendingCode) return
    if (pendingCode !== sync.code) {
      setMode("link")
      setInput(formatCode(pendingCode))
      document.getElementById("sync-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    onPendingHandled()
  }, [pendingCode, sync.code, onPendingHandled])

  const run = async (fn) => {
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }

  const enable = () => run(async () => {
    if (await sync.enable()) setShowQr(true)
  })
  const link = (e) => {
    e.preventDefault()
    run(async () => {
      if (await sync.link(input)) {
        setMode(null)
        setInput("")
      }
    })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatCode(sync.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      document.getElementById("sync-code")?.focus()
    }
  }
  const destroy = () => run(async () => {
    if (await sync.destroy()) setConfirmDelete(false)
  })

  const linkUrl = sync.code ? `${window.location.origin}/#sync=${sync.code}` : ""
  const statusText = {
    idle: sync.lastSynced ? `Synced ${ago(sync.lastSynced, now)}` : "Sync is on",
    syncing: "Syncing…",
    offline: "Offline — changes will sync when you're back",
    error: "Not synced",
  }[sync.status]

  return (
    <section id="sync-panel" aria-labelledby="sync-heading" className="mt-6 rounded-2xl bg-white p-4 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CloudIcon />
        </span>
        <div className="min-w-0">
          <h2 id="sync-heading" className="font-semibold text-slate-900">Sync across devices</h2>
          {sync.code ? (
            <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[sync.status]}`} aria-hidden="true" />
              {statusText}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No account or password — just a private sync code.</p>
          )}
        </div>
      </div>

      {sync.error && (
        <p className="studio-status flex items-start justify-between gap-3 !bg-rose-50 !text-rose-800" role="alert">
          <span>{sync.error}</span>
          <button type="button" className="shrink-0 font-semibold underline" onClick={sync.clearError}>Dismiss</button>
        </p>
      )}

      {!sync.code && mode !== "link" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={`${btn} studio-primary`} onClick={enable} disabled={busy}>
            {busy ? "Enabling…" : "Enable sync"}
          </button>
          <button type="button" className={btn} onClick={() => setMode("link")} disabled={busy}>I have a code</button>
        </div>
      )}

      {!sync.code && mode === "link" && (
        <form className="mt-4" onSubmit={link}>
          <label htmlFor="sync-input" className="text-sm font-medium text-slate-700">Sync code from your other device</label>
          <input
            id="sync-input"
            className="studio-input mt-2 w-full font-mono uppercase tracking-wider"
            placeholder="XXXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <p className="mt-2 text-xs text-slate-500">Tasks on this device are merged with the synced list.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className={`${btn} studio-primary`} disabled={busy || !input.trim()}>{busy ? "Linking…" : "Link this device"}</button>
            <button type="button" className={btn} onClick={() => { setMode(null); sync.clearError() }} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {sync.code && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">Enter this code on another device, or scan the QR code. Keep it private: anyone with it can see and edit your tasks.</p>
          <div className="mt-3 flex items-stretch gap-2">
            <input
              id="sync-code"
              readOnly
              aria-label="Your sync code"
              className="studio-input min-w-0 flex-1 font-mono text-[13px] tracking-wide sm:text-sm"
              value={formatCode(sync.code)}
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className={btn} onClick={copy} aria-label="Copy sync code">
              <CopyIcon width={16} height={16} />
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">{copied ? "Sync code copied" : ""}</span>
          {showQr && <QrCode text={linkUrl} />}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>{showQr ? "Hide QR code" : "Show QR code"}</button>
            <button type="button" className={btn} onClick={sync.syncNow} disabled={sync.status === "syncing"}>Sync now</button>
            <button type="button" className={btn} onClick={sync.disconnect}>Stop syncing here</button>
          </div>
          {confirmDelete ? (
            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              <p>Delete the synced copy from the server? Tasks stay on this device, and other linked devices stop syncing.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50" onClick={destroy} disabled={busy}>
                  {busy ? "Deleting…" : "Delete synced data"}
                </button>
                <button type="button" className="rounded-lg px-3 py-2 font-semibold text-rose-800 underline" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </div>
            </div>
          ) : (
            <button type="button" className="mt-3 text-sm font-medium text-slate-500 underline-offset-2 hover:text-rose-600 hover:underline" onClick={() => setConfirmDelete(true)}>
              Delete synced data from server…
            </button>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <BellIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">Reminders</h2>
            {!reminders.supported ? (
              <p className="text-sm text-slate-500">This browser doesn&apos;t support notifications.</p>
            ) : reminders.permission === "denied" ? (
              <p className="text-sm text-slate-500">Notifications are blocked for this site. Allow them in your browser settings to get reminders.</p>
            ) : (
              <label className="mt-1 flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-600">
                <span>Notify me about tasks due today while the app is open</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={reminders.enabled}
                  onChange={(e) => (e.target.checked ? reminders.enable() : reminders.disable())}
                />
                <span aria-hidden="true" className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 ${reminders.enabled ? "bg-brand-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#fff] shadow transition-all ${reminders.enabled ? "left-[22px]" : "left-0.5"}`} />
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SyncPanel
