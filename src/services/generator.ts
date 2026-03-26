const MAX_CODE_SIZE = 50 * 1024

const SYSTEM_PROMPT = `You are a Cloudflare Worker code generator. Given a user's description of a micro web app, generate a single, self-contained Cloudflare Worker.

Rules:
- Export a default object with a fetch(request) handler
- Return an HTML Response with inline CSS and inline JavaScript
- Do NOT import any external modules or npm packages
- Do NOT use any Cloudflare bindings (no env.KV, env.D1, etc.)
- The app must be fully self-contained in one file
- Use modern, clean CSS (flexbox, grid, custom properties)
- Make it mobile-responsive
- Make it visually polished with good typography, spacing, and color
- If the app needs external data, use fetch() to public APIs
- Always include a <meta name="viewport"> tag for mobile

Respond with ONLY the code. No explanations, no markdown fences, no comments outside the code.`

export function stripMarkdownFences(code: string): string {
  const fencePattern = /^```(?:\w+)?\n([\s\S]*?)\n```$/
  const match = code.trim().match(fencePattern)
  return match ? match[1].trim() : code.trim()
}

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateCode(code: string): ValidationResult {
  if (code.length > MAX_CODE_SIZE) {
    return { valid: false, error: "Generated code exceeds 50KB limit" }
  }
  if (!code.includes("export default")) {
    return { valid: false, error: "Code must contain export default" }
  }
  if (!code.includes("fetch")) {
    return { valid: false, error: "Code must contain a fetch handler" }
  }
  return { valid: true }
}

interface GenerateSuccess { success: true; code: string }
interface GenerateFailure { success: false; error: string }
type GenerateResult = GenerateSuccess | GenerateFailure

export async function generateAppCode(ai: Ai, prompt: string): Promise<GenerateResult> {
  try {
    const response = await ai.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }
    )

    const rawCode = typeof response === "string" ? response : (response as { response?: string }).response ?? ""
    const code = stripMarkdownFences(rawCode)
    const validation = validateCode(code)

    if (!validation.valid) {
      return { success: false, error: validation.error ?? "Invalid code generated" }
    }

    return { success: true, code }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: `AI generation failed: ${message}` }
  }
}
