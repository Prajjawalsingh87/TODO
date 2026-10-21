// /api/sync request handling, independent of the database driver so tests can
// run it against an in-memory Postgres (PGlite).
//
//   POST   /api/sync   Authorization: Bearer <sync code>
//          body { records: [...], create?: boolean }
//          -> 200 { records: [...all records for this code], serverTime }
//   DELETE /api/sync   Authorization: Bearer <sync code>  -> 204 (deletes everything for the code)
//
// Only a SHA-256 hash of the code is stored. Writes are last-write-wins per
// task on updatedAt (ties keep the stored copy), and deletes are tombstones.
import { createHash } from "node:crypto"
import { normalizeCode } from "../../src/sync/code.js"
import { FUTURE_SKEW_MS, MAX_BODY_BYTES, MAX_RECORDS, normalizeRecord } from "../../src/sync/records.js"

export const LIMITS = {
  requestsPerMinute: 60, // per IP, all sync requests
  createsPerHour: 10, // per IP, new sync spaces
  maxStoredRecords: 10000, // per sync code, tasks + tombstones
  futureSkewMs: FUTURE_SKEW_MS, // updatedAt further ahead than this is clamped and can't overwrite
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sync_spaces (
     code_hash text PRIMARY KEY,
     created_at timestamptz NOT NULL DEFAULT now(),
     last_seen timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sync_tasks (
     code_hash text NOT NULL REFERENCES sync_spaces(code_hash) ON DELETE CASCADE,
     task_id text NOT NULL,
     updated_at bigint NOT NULL,
     deleted boolean NOT NULL DEFAULT false,
     data jsonb NOT NULL,
     PRIMARY KEY (code_hash, task_id)
   )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
     bucket text PRIMARY KEY,
     hits integer NOT NULL,
     expires_at timestamptz NOT NULL
   )`,
]

const sha256 = (text) => createHash("sha256").update(text).digest("hex")
export const hashCode = (code) => sha256(`todo-sync:v1:${code}`)

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  })

const clientIp = (request) =>
  request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"

export function createSyncHandler({ getDb, now = Date.now, random = Math.random, limits = LIMITS, log = console }) {
  let schemaReady = null
  const ensureSchema = (db) => {
    schemaReady ??= (async () => {
      for (const statement of SCHEMA) {
        try {
          await db.query(statement)
        } catch (err) {
          // Two cold starts racing on CREATE TABLE IF NOT EXISTS can collide; the table exists either way.
          if (!/already exists|duplicate key/i.test(String(err?.message))) throw err
        }
      }
    })().catch((err) => {
      schemaReady = null
      throw err
    })
    return schemaReady
  }

  /** Fixed-window counter in Postgres; returns true when the request is allowed. */
  const allow = async (db, scope, ip, max, windowMs) => {
    const window = Math.floor(now() / windowMs)
    const bucket = `${scope}:${sha256(`ip:${ip}`).slice(0, 32)}:${window}`
    const rows = await db.query(
      `INSERT INTO rate_limits (bucket, hits, expires_at)
       VALUES ($1, 1, to_timestamp($2::double precision / 1000))
       ON CONFLICT (bucket) DO UPDATE SET hits = rate_limits.hits + 1
       RETURNING hits`,
      [bucket, (window + 1) * windowMs],
    )
    if (random() < 0.02) await db.query("DELETE FROM rate_limits WHERE expires_at < now()")
    return Number(rows[0].hits) <= max
  }

  const readBody = async (request) => {
    const declared = Number(request.headers.get("content-length"))
    if (declared > MAX_BODY_BYTES) return { error: json(413, { error: "Payload too large" }) }
    const text = await request.text()
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { error: json(413, { error: "Payload too large" }) }
    try {
      return { body: JSON.parse(text) }
    } catch {
      return { error: json(400, { error: "Body must be JSON" }) }
    }
  }

  const validateRecords = (body) => {
    if (!body || typeof body !== "object" || !Array.isArray(body.records)) return { error: "Expected { records: [...] }" }
    if (body.records.length > MAX_RECORDS) return { error: `Too many records (limit ${MAX_RECORDS})`, status: 413 }
    const byId = new Map()
    const maxTime = now() + limits.futureSkewMs
    for (let i = 0; i < body.records.length; i++) {
      const record = normalizeRecord(body.records[i])
      if (!record) return { error: `Invalid record at index ${i}` }
      // A fast clock must not win forever: clamp, and only use it for tasks the server lacks.
      if (record.updatedAt > maxTime) {
        record.updatedAt = maxTime
        record.clamped = true
      }
      const seen = byId.get(record.id)
      if (!seen || record.updatedAt > seen.updatedAt) byId.set(record.id, record)
    }
    return { records: [...byId.values()].map(({ clamped, ...r }) => ({ record: r, clamped: clamped === true })) }
  }

  return async function handle(request) {
    if (request.method !== "POST" && request.method !== "DELETE") {
      return json(405, { error: "Method not allowed" }, { allow: "POST, DELETE" })
    }
    try {
      const db = await getDb()
      await ensureSchema(db)
      const ip = clientIp(request)
      if (!(await allow(db, "req", ip, limits.requestsPerMinute, 60_000))) {
        return json(429, { error: "Too many requests, try again in a minute" }, { "retry-after": "60" })
      }

      const auth = request.headers.get("authorization") || ""
      const code = normalizeCode(auth.startsWith("Bearer ") ? auth.slice(7) : "")
      if (!code) return json(401, { error: "Missing or malformed sync code" })
      const codeHash = hashCode(code)

      if (request.method === "DELETE") {
        await db.query("DELETE FROM sync_spaces WHERE code_hash = $1", [codeHash])
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } })
      }

      const { body, error } = await readBody(request)
      if (error) return error
      const valid = validateRecords(body)
      if (valid.error) return json(valid.status || 400, { error: valid.error })
      const records = valid.records.map((v) => v.record)

      const existing = await db.query(
        "UPDATE sync_spaces SET last_seen = now() WHERE code_hash = $1 RETURNING code_hash",
        [codeHash],
      )
      if (!existing.length) {
        if (body.create !== true) return json(404, { error: "Unknown sync code" })
        if (!(await allow(db, "create", ip, limits.createsPerHour, 3_600_000))) {
          return json(429, { error: "Too many new sync codes from this network, try again later" }, { "retry-after": "3600" })
        }
        await db.query("INSERT INTO sync_spaces (code_hash) VALUES ($1) ON CONFLICT (code_hash) DO NOTHING", [codeHash])
      }

      if (records.length) {
        const [{ count }] = await db.query(
          "SELECT count(*) AS count FROM sync_tasks WHERE code_hash = $1 AND NOT (task_id = ANY($2::text[]))",
          [codeHash, records.map((r) => r.id)],
        )
        if (Number(count) + records.length > limits.maxStoredRecords) {
          return json(413, { error: `This sync code is full (limit ${limits.maxStoredRecords} tasks and deletions)` })
        }
        await db.query(
          `INSERT INTO sync_tasks (code_hash, task_id, updated_at, deleted, data)
           SELECT $1, r.id, r."updatedAt", coalesce(r.deleted, false), r.data
           FROM jsonb_to_recordset($2::jsonb) AS r(id text, "updatedAt" bigint, deleted boolean, data jsonb)
           ON CONFLICT (code_hash, task_id) DO UPDATE
             SET updated_at = excluded.updated_at, deleted = excluded.deleted, data = excluded.data
             WHERE excluded.updated_at > sync_tasks.updated_at
               AND NOT (excluded.task_id = ANY($3::text[]))`, // clamped records ($3) only fill gaps
          [
            codeHash,
            JSON.stringify(records.map((r) => ({ id: r.id, updatedAt: r.updatedAt, deleted: r.deleted === true, data: r }))),
            valid.records.filter((v) => v.clamped).map((v) => v.record.id),
          ],
        )
      }

      const rows = await db.query("SELECT data FROM sync_tasks WHERE code_hash = $1", [codeHash])
      return json(200, { records: rows.map((row) => row.data), serverTime: now() })
    } catch (err) {
      log.error("sync failed:", err?.message || err)
      return json(500, { error: "Sync is temporarily unavailable" })
    }
  }
}
