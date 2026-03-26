# InstaApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tool where users describe a micro web app in English and get a live, shareable URL in under 2 seconds — powered by Cloudflare Dynamic Workers.

**Architecture:** Single Hono Worker handles auth (Clerk), AI generation (Workers AI), sandboxed execution (Dynamic Workers), storage (D1), and frontend (Hono JSX). One deploy, one codebase.

**Tech Stack:** TypeScript, Hono, Clerk (@hono/clerk-auth), Cloudflare Workers, Dynamic Workers (LOADER binding), Workers AI (Llama 3.3 70B), D1, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-insta-app-design.md`

---

## File Structure

```
insta-app/
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml
├── schema.sql                          # D1 table definitions
├── src/
│   ├── index.ts                        # Hono app: routes + middleware wiring
│   ├── types.ts                        # Env, App, GenerateRequest types
│   ├── middleware/
│   │   └── auth.ts                     # Clerk auth middleware setup
│   ├── routes/
│   │   ├── landing.tsx                 # GET / — landing page
│   │   ├── dashboard.tsx               # GET /dashboard — user's apps + prompt input
│   │   ├── generate.ts                 # POST /generate — AI generation pipeline
│   │   ├── app-view.tsx                # GET /app/:id — embed view (code + iframe)
│   │   ├── app-delete.ts              # DELETE /app/:id — delete user's app
│   │   └── live.ts                     # GET /live/:id — serve Dynamic Worker
│   ├── services/
│   │   ├── generator.ts                # AI code generation + validation
│   │   ├── sandbox.ts                  # Dynamic Worker loading (LOADER.get)
│   │   └── outbound-proxy.ts           # Network filter for generated apps
│   ├── db/
│   │   └── apps.ts                     # D1 CRUD operations for apps table
│   └── lib/
│       └── id.ts                       # nanoid generation (8 chars)
├── tests/
│   ├── generator.test.ts              # Code generation + validation tests
│   ├── db.test.ts                     # D1 operations tests
│   ├── routes.test.ts                 # Route auth enforcement tests
│   └── id.test.ts                     # ID generation tests
└── docs/
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `wrangler.toml`
- Create: `src/types.ts`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
.wrangler/
.dev.vars
.superpowers/
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "insta-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/clerk-auth": "^2.0.0",
    "@clerk/backend": "^2.0.0",
    "nanoid": "^5.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260301.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 5: Create wrangler.toml**

```toml
name = "insta-app"
main = "src/index.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "insta-app-db"
database_id = "<fill-after-d1-create>"

[[worker_loaders]]
binding = "LOADER"
```

- [ ] **Step 6: Create src/types.ts**

```typescript
import type { Context } from "hono"

export interface Env {
  AI: Ai
  DB: D1Database
  LOADER: WorkerLoader
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

export interface AppRecord {
  id: string
  user_id: string
  prompt: string
  code: string
  created_at: number
  updated_at: number
}

export interface GenerateRequest {
  prompt: string
}

export interface GenerateResponse {
  id: string
  live_url: string
  embed_url: string
}

export type AppContext = Context<{ Bindings: Env }>
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold insta-app project"
```

---

## Task 2: ID Generation + D1 Schema + CRUD

**Files:**
- Create: `schema.sql`
- Create: `src/lib/id.ts`
- Create: `tests/id.test.ts`
- Create: `src/db/apps.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Create schema.sql**

```sql
CREATE TABLE IF NOT EXISTS apps (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  code        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
```

- [ ] **Step 2: Write failing test for ID generation**

```typescript
// tests/id.test.ts
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
```

- [ ] **Step 3: Implement ID generation**

```typescript
// src/lib/id.ts
import { nanoid } from "nanoid"

export function generateId(): string {
  return nanoid(8)
}
```

- [ ] **Step 4: Run ID tests — expected PASS**

Run: `npx vitest run tests/id.test.ts`

- [ ] **Step 5: Write failing tests for D1 operations**

```typescript
// tests/db.test.ts
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
```

- [ ] **Step 6: Implement D1 operations**

```typescript
// src/db/apps.ts
import type { AppRecord } from "../types"

interface CreateAppInput {
  id: string
  user_id: string
  prompt: string
  code: string
}

export async function createApp(db: D1Database, input: CreateAppInput): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare("INSERT INTO apps (id, user_id, prompt, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(input.id, input.user_id, input.prompt, input.code, now, now)
    .run()
}

export async function getAppById(db: D1Database, id: string): Promise<AppRecord | null> {
  return db.prepare("SELECT * FROM apps WHERE id = ?").bind(id).first<AppRecord>()
}

export async function getAppsByUser(db: D1Database, userId: string): Promise<AppRecord[]> {
  const { results } = await db
    .prepare("SELECT * FROM apps WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<AppRecord>()
  return results
}

export async function deleteApp(db: D1Database, id: string, userId: string): Promise<void> {
  await db.prepare("DELETE FROM apps WHERE id = ? AND user_id = ?").bind(id, userId).run()
}

export async function countUserAppsToday(db: D1Database, userId: string): Promise<number> {
  const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM apps WHERE user_id = ? AND created_at >= ?")
    .bind(userId, startOfDay)
    .first<{ count: number }>()
  return result?.count ?? 0
}
```

- [ ] **Step 7: Run all tests — expected PASS**

Run: `npx vitest run`

- [ ] **Step 8: Commit**

```bash
git add schema.sql src/lib/id.ts src/db/apps.ts tests/id.test.ts tests/db.test.ts
git commit -m "feat: add ID generation and D1 CRUD operations"
```

---

## Task 3: Code Generator + Validator

**Files:**
- Create: `src/services/generator.ts`
- Create: `tests/generator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/generator.test.ts
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
    const code = 'export default { async fetch() {} }' + "x".repeat(51000)
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
```

- [ ] **Step 2: Implement generator**

```typescript
// src/services/generator.ts
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
    const response = (await ai.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as BaseAiTextGenerationModels,
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }
    )) as { response?: string }

    const rawCode = response.response ?? ""
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
```

- [ ] **Step 3: Run tests — expected PASS**

Run: `npx vitest run tests/generator.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/services/generator.ts tests/generator.test.ts
git commit -m "feat: add AI code generation and validation"
```

---

## Task 4: Outbound Proxy + Sandbox Loader

**Files:**
- Create: `src/services/outbound-proxy.ts`
- Create: `src/services/sandbox.ts`

- [ ] **Step 1: Create outbound proxy**

```typescript
// src/services/outbound-proxy.ts
import { WorkerEntrypoint } from "cloudflare:workers"
import type { Env } from "../types"

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google",
  "[::1]",
]

export class OutboundProxy extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const isBlocked = BLOCKED_HOSTS.some((host) => url.hostname.includes(host))

    if (isBlocked) {
      return new Response("Blocked: access to internal resources is not allowed", { status: 403 })
    }

    return fetch(request)
  }
}
```

- [ ] **Step 2: Create sandbox loader**

```typescript
// src/services/sandbox.ts
import type { Env } from "../types"
import { getAppById } from "../db/apps"

export async function executeApp(env: Env, appId: string, request: Request): Promise<Response> {
  const app = await getAppById(env.DB, appId)

  if (!app) {
    throw new Error("App not found")
  }

  const worker = env.LOADER.get(appId, async () => ({
    compatibilityDate: "2026-03-01",
    mainModule: "app.js",
    modules: { "app.js": app.code },
  }))

  return worker.getEntrypoint().fetch(request)
}
```

Note: The outbound proxy binding (globalOutbound) will be added once we verify the Dynamic Workers API supports it in the current beta. For now the sandbox loader works without network restrictions. This is a known security gap for v1 that gets addressed post-launch.

- [ ] **Step 3: Commit**

```bash
git add src/services/outbound-proxy.ts src/services/sandbox.ts
git commit -m "feat: add Dynamic Worker sandbox with outbound proxy"
```

---

## Task 5: Auth Middleware

**Files:**
- Create: `src/middleware/auth.ts`

- [ ] **Step 1: Create auth middleware**

```typescript
// src/middleware/auth.ts
import { clerkMiddleware, getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { Hono } from "hono"

export function applyAuth(app: Hono<{ Bindings: Env }>) {
  app.use("/dashboard/*", clerkMiddleware())
  app.use("/generate", clerkMiddleware())
  app.use("/app/*", clerkMiddleware())

  app.use("/dashboard/*", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.redirect("/")
    await next()
  })

  app.use("/generate", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401)
    await next()
  })

  app.use("/app/*", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.redirect("/")
    await next()
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware/auth.ts
git commit -m "feat: add Clerk auth middleware"
```

---

## Task 6: Route Handlers

**Files:**
- Create: `src/routes/landing.tsx`
- Create: `src/routes/dashboard.tsx`
- Create: `src/routes/generate.ts`
- Create: `src/routes/app-view.tsx`
- Create: `src/routes/app-delete.ts`
- Create: `src/routes/live.ts`

These files contain the Hono route handlers with JSX templates for the UI pages. The implementer should follow the spec for route behavior and create clean, minimal dark-themed UI pages.

Key requirements per route:

**landing.tsx (GET /):** Minimal landing page — title "InstaApp", tagline "Describe an app. Get a live URL.", sign-in CTA linking to /dashboard, 3 example prompts for inspiration. Dark theme (#0a0a0a background).

**dashboard.tsx (GET /dashboard):** Prompt textarea + "Generate" button at top. Uses fetch() to POST /generate on submit, shows loading state, displays result link on success. Below: list of user's apps from D1 with View/Live URL/Delete links.

**generate.ts (POST /generate):** Validates prompt (non-empty, max 500 chars). Checks rate limit (20/day via countUserAppsToday). Calls generateAppCode. Stores in D1 via createApp. Returns JSON { id, live_url, embed_url }.

**app-view.tsx (GET /app/:id):** Split layout — code on left, iframe preview on right. Verifies user_id matches. Copy URL button for the live link.

**app-delete.ts (DELETE /app/:id):** Calls deleteApp with id + userId. Returns { success: true }.

**live.ts (GET /live/:id):** Loads app from D1, spawns/reuses Dynamic Worker via executeApp(), forwards request, returns response. Shows 404 page if app not found, error page if execution fails. No auth required.

- [ ] **Step 1: Create all route files following the spec requirements above**

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/routes/
git commit -m "feat: add all route handlers"
```

---

## Task 7: Wire Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create entry point**

```typescript
// src/index.ts
import { Hono } from "hono"
import type { Env } from "./types"
import { applyAuth } from "./middleware/auth"
import landing from "./routes/landing"
import dashboard from "./routes/dashboard"
import generate from "./routes/generate"
import appView from "./routes/app-view"
import appDelete from "./routes/app-delete"
import live from "./routes/live"
import { OutboundProxy } from "./services/outbound-proxy"

const app = new Hono<{ Bindings: Env }>()

applyAuth(app)

app.route("/", landing)
app.route("/", dashboard)
app.route("/", generate)
app.route("/", appView)
app.route("/", appDelete)
app.route("/", live)

export default app
export { OutboundProxy }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up Hono app with all routes and middleware"
```

---

## Task 8: Deploy + GitHub Repo + Smoke Test

- [ ] **Step 1: Create Clerk application**

Go to clerk.com, create app. Enable Google + GitHub social login. Get publishable key and secret key.

- [ ] **Step 2: Create D1 database**

Run: `npx wrangler d1 create insta-app-db`
Update `wrangler.toml` with the database_id.

- [ ] **Step 3: Apply schema**

Run: `npx wrangler d1 execute insta-app-db --remote --file=schema.sql`

- [ ] **Step 4: Set secrets**

```bash
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
```

- [ ] **Step 5: Deploy**

Run: `npx wrangler deploy`

- [ ] **Step 6: Create GitHub repo + push**

```bash
gh repo create insta-app --public --source=. --remote=origin --push
```

- [ ] **Step 7: Smoke test**

1. Visit Worker URL -> landing page loads
2. Click "Get Started" -> Clerk sign-in
3. Sign in with GitHub -> dashboard
4. Generate "a hello world page with big colorful text"
5. Click Live URL -> generated app works
6. Open Live URL in incognito -> works without auth
7. Open on mobile -> responsive

- [ ] **Step 8: Commit final config**

```bash
git add wrangler.toml
git commit -m "chore: configure D1 and deploy"
```
