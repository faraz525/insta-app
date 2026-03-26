import { describe, it, expect } from "vitest"
import { generateId } from "../src/lib/id"

describe("generateId", () => {
  it("returns an 8-character string", () => {
    const id = generateId()
    expect(id).toHaveLength(8)
  })

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it("contains only URL-safe characters", () => {
    const id = generateId()
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
  })
})
