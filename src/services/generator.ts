const MAX_CODE_SIZE = 50 * 1024

const SYSTEM_PROMPT = `You are a Cloudflare Worker code generator. Generate a single self-contained Cloudflare Worker that serves a web app.

Your output MUST follow this exact structure:

export default {
  async fetch(request) {
    const html = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Title</title>
  <style>/* your CSS here */</style>
</head>
<body>
  <!-- your HTML here -->
  <script>/* your JS here */</script>
</body>
</html>\`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
};

Rules:
- ALWAYS use "export default { async fetch(request) { ... } }" exactly as shown above
- All CSS must be inline in a <style> tag
- All JavaScript must be inline in a <script> tag
- Do NOT import any external modules
- Make it mobile-responsive and visually polished
- If you need external data, use fetch() to public APIs inside the client-side script

Respond with ONLY the code. No explanations, no markdown.`

export function stripMarkdownFences(code: string): string {
  const trimmed = code.trim()
  // Match fenced code block anywhere in the string (not just whole-string match)
  const fencePattern = /```(?:\w+)?\n([\s\S]*?)```/
  const match = trimmed.match(fencePattern)
  if (match) {
    return match[1].trim()
  }
  // Also strip leading text before "export" if present
  const exportIndex = trimmed.indexOf("export default")
  if (exportIndex > 0) {
    return trimmed.slice(exportIndex).trim()
  }
  return trimmed
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

  // Check for truncated output — count braces and backticks
  const openBraces = (code.match(/{/g) || []).length
  const closeBraces = (code.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    return { valid: false, error: "Code appears truncated (mismatched braces). Try a simpler prompt." }
  }

  const backticks = (code.match(/`/g) || []).length
  if (backticks % 2 !== 0) {
    return { valid: false, error: "Code appears truncated (unclosed template literal). Try a simpler prompt." }
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
        max_tokens: 4096,
      }
    )

    const rawCode = typeof response === "string" ? response : (response as { response?: string }).response ?? ""
    let code = stripMarkdownFences(rawCode)

    // If AI returned HTML without a Worker wrapper, wrap it automatically
    if (!code.includes("export default") && (code.includes("<html") || code.includes("<!DOCTYPE") || code.includes("<body"))) {
      const escaped = code.replace(/`/g, "\\`").replace(/\$/g, "\\$")
      code = `export default {\n  async fetch(request) {\n    const html = \`${escaped}\`;\n    return new Response(html, { headers: { "Content-Type": "text/html" } });\n  }\n};`
    }

    const validation = validateCode(code)

    if (!validation.valid) {
      console.error("Validation failed. Raw AI output (first 500 chars):", rawCode.slice(0, 500))
      return { success: false, error: validation.error ?? "Invalid code generated" }
    }

    return { success: true, code }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: `AI generation failed: ${message}` }
  }
}
