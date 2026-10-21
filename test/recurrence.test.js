import { describe, expect, it } from "vitest"
import { firstDue, nextDue, nextOccurrence, normalizeRepeat, repeatLabel, withAnchor } from "../src/recurrence.js"

// 2026-10-21 is a Wednesday.
const TODAY = "2026-10-21"

describe("nextDue", () => {
  it("daily moves one day, across month and year ends", () => {
    expect(nextDue({ freq: "daily" }, "2026-10-31")).toBe("2026-11-01")
    expect(nextDue({ freq: "daily" }, "2026-12-31")).toBe("2027-01-01")
  })
  it("weekly picks the next chosen weekday", () => {
    const monWed = { freq: "weekly", days: [1, 3] }
    expect(nextDue(monWed, "2026-10-19")).toBe("2026-10-21") // Mon -> Wed
    expect(nextDue(monWed, "2026-10-21")).toBe("2026-10-26") // Wed -> next Mon
    expect(nextDue({ freq: "weekly", days: [3] }, "2026-10-21")).toBe("2026-10-28")
  })
  it("monthly keeps the anchor day and clamps short months", () => {
    const on31 = { freq: "monthly", day: 31 }
    expect(nextDue(on31, "2027-01-31")).toBe("2027-02-28")
    expect(nextDue(on31, "2027-02-28")).toBe("2027-03-31")
    expect(nextDue(on31, "2028-01-31")).toBe("2028-02-29")
    expect(nextDue({ freq: "monthly", day: 15 }, "2026-12-15")).toBe("2027-01-15")
    expect(nextDue({ freq: "monthly", day: 15 }, "2026-10-03")).toBe("2026-10-15")
  })
})

describe("firstDue", () => {
  it("can be today", () => {
    expect(firstDue({ freq: "daily" }, TODAY)).toBe(TODAY)
    expect(firstDue({ freq: "weekly", days: [3] }, TODAY)).toBe(TODAY)
    expect(firstDue({ freq: "weekly", days: [5] }, TODAY)).toBe("2026-10-23")
  })
})

describe("nextOccurrence", () => {
  const base = { id: "abc", todo: "Water plants", priority: "high", completed: false }

  it("schedules after the due date when completed early", () => {
    const next = nextOccurrence({ ...base, due: "2026-10-25", repeat: { freq: "daily" } }, TODAY, 42)
    expect(next).toMatchObject({ id: "abc~2026-10-26", due: "2026-10-26", completed: false, priority: "high", createdAt: 42, updatedAt: 42 })
    expect(next.repeat.series).toBe("abc")
  })
  it("schedules after today when completed late, instead of piling up overdue copies", () => {
    expect(nextOccurrence({ ...base, due: "2026-10-01", repeat: { freq: "daily" } }, TODAY).due).toBe("2026-10-22")
  })
  it("keeps the series id so every device derives the same next id", () => {
    const first = nextOccurrence({ ...base, due: TODAY, repeat: { freq: "daily" } }, TODAY)
    const second = nextOccurrence({ ...first, completed: true }, "2026-10-22")
    expect(second.id).toBe("abc~2026-10-23")
  })
})

describe("series ids", () => {
  it("never grow when the series was lost (e.g. edited occurrence)", () => {
    let todo = { id: "abc~2026-10-21", todo: "x", priority: "low", due: "2026-10-21", repeat: { freq: "daily" } }
    for (let i = 0; i < 20; i++) todo = { ...nextOccurrence(todo, todo.due), repeat: { freq: "daily" } }
    expect(todo.id).toMatch(/^abc~\d{4}-\d{2}-\d{2}$/)
  })
})

describe("normalizeRepeat", () => {
  it("validates rules", () => {
    expect(normalizeRepeat(null)).toBeNull()
    expect(normalizeRepeat({ freq: "yearly" })).toBeNull()
    expect(normalizeRepeat({ freq: "weekly", days: [] })).toBeNull()
    expect(normalizeRepeat({ freq: "weekly", days: [5, 1, 1, 9, "2"] })).toEqual({ freq: "weekly", days: [1, 5] })
    expect(normalizeRepeat({ freq: "monthly", day: 40 })).toEqual({ freq: "monthly" })
    expect(normalizeRepeat({ freq: "daily", series: "bad id!" })).toEqual({ freq: "daily" })
  })
  it("withAnchor sets the monthly day from the due date", () => {
    expect(withAnchor({ freq: "monthly" }, "2026-01-31")).toEqual({ freq: "monthly", day: 31 })
    expect(withAnchor({ freq: "daily", day: 3 }, "2026-01-31")).toEqual({ freq: "daily" })
  })
  it("labels", () => {
    expect(repeatLabel({ freq: "weekly", days: [1, 2, 3, 4, 5] })).toBe("Weekdays")
    expect(repeatLabel({ freq: "weekly", days: [1, 4] })).toBe("Mon, Thu")
    expect(repeatLabel({ freq: "monthly", day: 22 })).toBe("Monthly on the 22nd")
  })
})
