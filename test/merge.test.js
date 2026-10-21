import { describe, expect, it } from "vitest"
import { applyRemote, fromRecords, mergeRecords, normalizeRecord, toRecords } from "../src/sync/records.js"
import { encodeCode, formatCode, generateCode, normalizeCode } from "../src/sync/code.js"
import { loadSaved, mergeImport, stamp } from "../src/todoUtils.js"

const task = (id, updatedAt, extra = {}) => ({
  id, todo: `Task ${id}`, completed: false, due: "", priority: "medium", repeat: null, createdAt: 1, updatedAt, ...extra,
})
const tomb = (id, updatedAt) => ({ id, deleted: true, updatedAt })
const byId = (records) => Object.fromEntries(records.map((r) => [r.id, r]))

describe("mergeRecords (last write wins)", () => {
  it("keeps the newer copy of each task from either side", () => {
    const merged = byId(mergeRecords(
      [task("a", 5, { todo: "local a" }), task("b", 1, { todo: "local b" })],
      [task("a", 3, { todo: "remote a" }), task("b", 9, { todo: "remote b" })],
    ))
    expect(merged.a.todo).toBe("local a")
    expect(merged.b.todo).toBe("remote b")
  })

  it("unions tasks that exist on only one side", () => {
    expect(mergeRecords([task("a", 1)], [task("b", 1)]).map((r) => r.id).sort()).toEqual(["a", "b"])
  })

  it("lets the remote copy win a tie so all devices converge", () => {
    const merged = byId(mergeRecords([task("a", 7, { todo: "local" })], [task("a", 7, { todo: "server" })]))
    expect(merged.a.todo).toBe("server")
  })

  it("a newer tombstone deletes the task, an older one does not", () => {
    expect(byId(mergeRecords([task("a", 4)], [tomb("a", 5)])).a.deleted).toBe(true)
    expect(byId(mergeRecords([tomb("a", 3)], [task("a", 4)])).a.deleted).toBeUndefined()
  })

  it("an edit made after a delete brings the task back", () => {
    expect(byId(mergeRecords([task("a", 10, { todo: "edited" })], [tomb("a", 6)])).a.todo).toBe("edited")
  })

  it("is order independent for distinct timestamps", () => {
    const left = [task("a", 1), tomb("b", 8), task("c", 3)]
    const right = [task("a", 2), task("b", 4), tomb("c", 2)]
    const ab = fromRecords(mergeRecords(left, right))
    const ba = fromRecords(mergeRecords(right, left))
    expect(ab).toEqual(ba)
  })
})

describe("app state <-> records", () => {
  it("round-trips tasks and tombstones", () => {
    const state = { todos: [task("a", 1, { createdAt: 2 }), task("b", 1, { createdAt: 3 })], tombstones: { z: 9 } }
    const back = fromRecords(toRecords(state))
    expect(back.todos.map((t) => t.id)).toEqual(["b", "a"]) // newest first
    expect(back.tombstones).toEqual({ z: 9 })
  })

  it("applyRemote returns the same object when nothing changed", () => {
    const state = { todos: [task("a", 2)], tombstones: { x: 1 } }
    expect(applyRemote(state, [{ ...task("a", 2) }, tomb("x", 1)])).toBe(state)
    expect(applyRemote(state, [task("a", 3, { todo: "new" })]).todos[0].todo).toBe("new")
  })

  it("applyRemote removes tasks deleted elsewhere", () => {
    const next = applyRemote({ todos: [task("a", 2)], tombstones: {} }, [tomb("a", 3)])
    expect(next.todos).toEqual([])
    expect(next.tombstones).toEqual({ a: 3 })
  })
})

describe("normalizeRecord", () => {
  it("rejects bad ids, timestamps and empty tasks", () => {
    expect(normalizeRecord(task("a b", 1))).toBeNull()
    expect(normalizeRecord(task("a", -1))).toBeNull()
    expect(normalizeRecord(task("a", 1.5))).toBeNull()
    expect(normalizeRecord({ ...task("a", 1), todo: "  " })).toBeNull()
    expect(normalizeRecord([])).toBeNull()
  })
  it("cleans fields it does not know", () => {
    const r = normalizeRecord({ ...task("a", 1), priority: "urgent", due: "2026-02-30", evil: "<script>" })
    expect(r).toMatchObject({ priority: "medium", due: "" })
    expect(r).not.toHaveProperty("evil")
  })
  it("accepts tombstones", () => {
    expect(normalizeRecord({ id: "a", deleted: true, updatedAt: 4, todo: "x" })).toEqual(tomb("a", 4))
  })
})

describe("timestamps", () => {
  it("stamp is always newer than the previous version", () => {
    expect(stamp({ updatedAt: 100 }, 50)).toBe(101)
    expect(stamp({ updatedAt: 100 }, 500)).toBe(500)
  })
  it("old saves get createdAt in their existing order", () => {
    const loaded = loadSaved(JSON.stringify([{ id: 1, todo: "new" }, { id: 2, todo: "old" }]), 1000)
    expect(loaded.map((t) => [t.id, t.createdAt, t.updatedAt])).toEqual([["1", 1000, 0], ["2", 999, 0]])
  })
  it("imported tasks get a fresh updatedAt so they sync", () => {
    const { todos } = mergeImport(JSON.stringify([{ id: "x", todo: "imported", updatedAt: 5 }]), [], 777)
    expect(todos[0].updatedAt).toBe(777)
  })
})

describe("sync codes", () => {
  it("are 26 characters carrying 128 bits", () => {
    expect(encodeCode(new Uint8Array(16))).toBe("0".repeat(26))
    expect(encodeCode(new Uint8Array(16).fill(255))).toBe("7" + "Z".repeat(25))
    const code = generateCode()
    expect(normalizeCode(code)).toBe(code)
  })
  it("normalize typed input and reject garbage", () => {
    const code = generateCode()
    expect(normalizeCode(formatCode(code).toLowerCase())).toBe(code)
    expect(normalizeCode(` ${formatCode(code)} `)).toBe(code)
    expect(normalizeCode("O".repeat(26))).toBe("0".repeat(26))
    expect(normalizeCode("8" + "0".repeat(25))).toBeNull() // > 128 bits
    expect(normalizeCode("too-short")).toBeNull()
    expect(normalizeCode("U".repeat(26))).toBeNull()
    expect(normalizeCode(null)).toBeNull()
  })
  it("formats as 6-5-5-5-5", () => {
    expect(formatCode("ABCDEFGHJKMNPQRSTVWXYZ0123")).toBe("ABCDEF-GHJKM-NPQRS-TVWXY-Z0123")
  })
})

describe("clock skew", () => {
  it("a local record stamped beyond the server's limit yields to the server copy", () => {
    const serverTime = 1_000_000
    const merged = byId(mergeRecords([task("a", serverTime + 86_400_000, { todo: "stale fast clock" })], [task("a", serverTime - 5, { todo: "server" })], serverTime))
    expect(merged.a.todo).toBe("server")
    // ...but a normal newer local edit still wins
    const normal = byId(mergeRecords([task("a", serverTime + 10, { todo: "local" })], [task("a", serverTime - 5, { todo: "server" })], serverTime))
    expect(normal.a.todo).toBe("local")
  })
})
