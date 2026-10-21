import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { LIMITS, createSyncHandler, hashCode } from "../api/_lib/sync.js"
import { generateCode, formatCode } from "../src/sync/code.js"
import { MAX_BODY_BYTES } from "../src/sync/records.js"

const pg = new PGlite()
const db = { query: async (text, params) => (await pg.query(text, params)).rows }
afterAll(() => pg.close())

let clock
let handle
beforeEach(async () => {
  await pg.exec("DROP TABLE IF EXISTS sync_tasks, sync_spaces, rate_limits")
  clock = 1_800_000_000_000
  handle = createSyncHandler({ getDb: () => db, now: () => clock, random: () => 1, log: { error() {} } })
})

const task = (id, updatedAt, extra = {}) => ({
  id, todo: `Task ${id}`, completed: false, due: "", priority: "medium", repeat: null, createdAt: 1, updatedAt, ...extra,
})

const call = async (code, body, { method = "POST", ip = "203.0.113.7", headers = {} } = {}) => {
  const res = await handle(new Request("https://todo.test/api/sync", {
    method,
    headers: { "content-type": "application/json", "x-real-ip": ip, ...(code ? { authorization: `Bearer ${code}` } : {}), ...headers },
    body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  }))
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}
const ids = (records) => records.map((r) => r.id).sort()

describe("POST /api/sync", () => {
  it("creates a space, then returns the merged list to another device", async () => {
    const code = generateCode()
    const a = await call(code, { create: true, records: [task("a", 1)] })
    expect(a.status).toBe(200)
    expect(ids(a.body.records)).toEqual(["a"])

    // Second device links with the formatted, lower-case code and brings its own task.
    const b = await call(formatCode(code).toLowerCase(), { records: [task("b", 2)] })
    expect(b.status).toBe(200)
    expect(ids(b.body.records)).toEqual(["a", "b"])
  })

  it("refuses unknown codes unless creating", async () => {
    const res = await call(generateCode(), { records: [] })
    expect(res.status).toBe(404)
  })

  it("rejects missing or malformed codes", async () => {
    expect((await call(null, { records: [] })).status).toBe(401)
    expect((await call("not-a-code", { records: [] })).status).toBe(401)
  })

  it("stores only a hash of the code", async () => {
    const code = generateCode()
    await call(code, { create: true, records: [task("a", 1)] })
    const spaces = await db.query("SELECT code_hash FROM sync_spaces")
    expect(spaces).toEqual([{ code_hash: hashCode(code) }])
    const dump = JSON.stringify(await db.query("SELECT * FROM sync_tasks"))
    expect(dump).not.toContain(code)
  })

  it("is last-write-wins per task, keeping the stored copy on ties", async () => {
    const code = generateCode()
    await call(code, { create: true, records: [task("a", 10, { todo: "v10" }), task("b", 10, { todo: "b10" })] })
    const res = await call(code, { records: [task("a", 5, { todo: "stale" }), task("b", 10, { todo: "tie" })] })
    const byId = Object.fromEntries(res.body.records.map((r) => [r.id, r]))
    expect(byId.a.todo).toBe("v10")
    expect(byId.b.todo).toBe("b10")
    const newer = await call(code, { records: [task("a", 11, { todo: "v11" })] })
    expect(newer.body.records.find((r) => r.id === "a").todo).toBe("v11")
  })

  it("keeps tombstones so deletes reach other devices", async () => {
    const code = generateCode()
    await call(code, { create: true, records: [task("a", 1)] })
    await call(code, { records: [{ id: "a", deleted: true, updatedAt: 2 }] })
    const res = await call(code, { records: [task("a", 1)] }) // offline device with the old copy
    expect(res.body.records).toEqual([{ id: "a", deleted: true, updatedAt: 2 }])
  })

  it("keeps spaces separate", async () => {
    const one = generateCode()
    const two = generateCode()
    await call(one, { create: true, records: [task("a", 1)] })
    const res = await call(two, { create: true, records: [task("b", 1)] })
    expect(ids(res.body.records)).toEqual(["b"])
  })

  it("clamps timestamps from clocks far in the future", async () => {
    const code = generateCode()
    const res = await call(code, { create: true, records: [task("a", clock + 10 * 86_400_000)] })
    expect(res.body.records[0].updatedAt).toBe(clock + LIMITS.futureSkewMs)
  })

  it("validates the payload", async () => {
    const code = generateCode()
    expect((await call(code, "{nope")).status).toBe(400)
    expect((await call(code, { tasks: [] })).status).toBe(400)
    const bad = await call(code, { create: true, records: [task("a", 1), { id: "x y", todo: "t", updatedAt: 1 }] })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toMatch(/index 1/)
    expect((await call(code, { create: true, records: Array.from({ length: 5001 }, (_, i) => task(`t${i}`, 1)) })).status).toBe(413)
  })

  it("rejects bodies over the size limit", async () => {
    const big = JSON.stringify({ records: [], pad: "x".repeat(MAX_BODY_BYTES) })
    expect((await call(generateCode(), big)).status).toBe(413)
    expect((await call(generateCode(), { records: [] }, { headers: { "content-length": String(MAX_BODY_BYTES + 1) } })).status).toBe(413)
  })

  it("strips unknown fields before storing", async () => {
    const code = generateCode()
    const res = await call(code, { create: true, records: [{ ...task("a", 1), html: "<img onerror=x>" }] })
    expect(res.body.records[0]).not.toHaveProperty("html")
  })
})

describe("rate limiting", () => {
  it("limits requests per IP per minute", async () => {
    const code = generateCode()
    for (let i = 0; i < LIMITS.requestsPerMinute; i++) {
      expect((await call(code, { create: true, records: [] })).status).toBe(200)
    }
    const limited = await call(code, { records: [] })
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBe("60")
    expect((await call(code, { records: [] }, { ip: "198.51.100.1" })).status).toBe(200) // other IP
    clock += 60_000
    expect((await call(code, { records: [] })).status).toBe(200) // next window
  })

  it("limits new sync codes per IP per hour", async () => {
    for (let i = 0; i < LIMITS.createsPerHour; i++) {
      expect((await call(generateCode(), { create: true, records: [] })).status).toBe(200)
    }
    expect((await call(generateCode(), { create: true, records: [] })).status).toBe(429)
  })

  it("stores hashed IPs, not addresses", async () => {
    await call(generateCode(), { records: [] })
    expect(JSON.stringify(await db.query("SELECT bucket FROM rate_limits"))).not.toContain("203.0.113.7")
  })
})

describe("DELETE /api/sync", () => {
  it("removes every record for the code", async () => {
    const code = generateCode()
    await call(code, { create: true, records: [task("a", 1)] })
    expect((await call(code, null, { method: "DELETE" })).status).toBe(204)
    expect(await db.query("SELECT * FROM sync_tasks")).toEqual([])
    expect((await call(code, { records: [] })).status).toBe(404)
  })
})

it("answers 405 for other methods", async () => {
  expect((await call(generateCode(), null, { method: "GET" })).status).toBe(405)
})
