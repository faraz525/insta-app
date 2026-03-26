import { describe, it, expect, vi } from "vitest"
import { generateAppCode, validateCode, stripMarkdownFences } from "../src/services/generator"

describe("stripMarkdownFences", () => {
  it("strips ```js fences", () => {
    const input = '```js\nexport default { fetch() {} }\n```'
    expect(stripMarkdownFences(input)).toBe("export default { fetch() {} }")
  })

  it("strips ```typescript fences", () => {
    const input = '```typescript\nexport default { fetch() {} }\n```'
    expect(stripMarkdownFences(input)).toBe("export default { fetch() {} }")
  })

  it("returns unfenced code as-is", () => {
    const input = "export default { fetch() {} }"
    expect(stripMarkdownFences(input)).toBe(input)
  })

  it("handles fences with no language tag", () => {
    const input = '```\nexport default { fetch() {} }\n```'
    expect(stripMarkdownFences(input)).toBe("export default { fetch() {} }")
  })
})

describe("validateCode", () => {
  it("accepts valid Worker code", () => {
    const code = 'export default { async fetch(request) { return new Response("hi") } }'
    expect(validateCode(code).valid).toBe(true)
  })

  it("rejects code without export default", () => {
    const result = validateCode('function hello() { return "hi" }')
    expect(result.valid).toBe(false)
    expect(result.error).toContain("export default")
  })

  it("rejects code without fetch", () => {
    const result = validateCode("export default { hello() {} }")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("fetch")
  })

  it("rejects code over 50KB", () => {
    const code = 'export default { async fetch() {} }' + "x".repeat(52000)
    expect(validateCode(code).valid).toBe(false)
  })
})

describe("generateAppCode", () => {
  it("calls Workers AI and returns valid code", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: 'export default { async fetch() { return new Response("<h1>Hello</h1>", { headers: { "Content-Type": "text/html" } }) } }',
      }),
    } as unknown as Ai

    const result = await generateAppCode(mockAi, "a hello world page")
    expect(result.success).toBe(true)
    if (result.success) expect(result.code).toContain("export default")
  })

  it("returns error when AI generates invalid code", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ response: "This is not valid code" }),
    } as unknown as Ai

    expect((await generateAppCode(mockAi, "something")).success).toBe(false)
  })

  it("returns error when AI throws", async () => {
    const mockAi = {
      run: vi.fn().mockRejectedValue(new Error("rate limited")),
    } as unknown as Ai

    expect((await generateAppCode(mockAi, "something")).success).toBe(false)
  })
})
