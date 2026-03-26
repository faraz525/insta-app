import { describe, it, expect, vi } from "vitest"
import { createApp, getAppById, getAppsByUser, deleteApp, countUserAppsToday } from "../src/db/apps"

function mockD1() {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue({ results: [] }),
  }
  return {
    prepare: vi.fn().mockReturnValue(stmt),
    stmt,
  } as unknown as D1Database & { stmt: typeof stmt }
}

describe("createApp", () => {
  it("inserts an app record", async () => {
    const db = mockD1()
    await createApp(db, {
      id: "abc12345",
      user_id: "user_123",
      prompt: "a todo app",
      code: "export default { fetch() { return new Response('hi') } }",
    })
    const sql = db.prepare.mock.calls[0][0] as string
    expect(sql).toContain("INSERT INTO apps")
  })
})

describe("getAppById", () => {
  it("queries by ID", async () => {
    const db = mockD1()
    await getAppById(db, "abc12345")
    expect(db.stmt.bind).toHaveBeenCalledWith("abc12345")
  })
})

describe("getAppsByUser", () => {
  it("queries by user_id ordered by created_at desc", async () => {
    const db = mockD1()
    await getAppsByUser(db, "user_123")
    const sql = db.prepare.mock.calls[0][0] as string
    expect(sql).toContain("user_id = ?")
    expect(sql).toContain("ORDER BY created_at DESC")
  })
})

describe("deleteApp", () => {
  it("deletes by ID and user_id", async () => {
    const db = mockD1()
    await deleteApp(db, "abc12345", "user_123")
    const sql = db.prepare.mock.calls[0][0] as string
    expect(sql).toContain("DELETE FROM apps")
    expect(db.stmt.bind).toHaveBeenCalledWith("abc12345", "user_123")
  })
})

describe("countUserAppsToday", () => {
  it("counts apps created today by user", async () => {
    const db = mockD1()
    db.stmt.first.mockResolvedValue({ count: 5 })
    const count = await countUserAppsToday(db, "user_123")
    expect(count).toBe(5)
  })
})
