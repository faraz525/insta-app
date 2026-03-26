# InstaApp — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Repo:** insta-app

## Overview

InstaApp lets users describe a micro web app in plain English and get a live, shareable URL in under 2 seconds. Each generated app runs in an isolated Cloudflare Dynamic Worker (V8 sandbox). Built for a weekend project + Twitter demo.

**Tweet pitch:** "I built a tool where you describe a micro-app and it's live in 2 seconds. No code. No deploy. Just words to URL."

## Architecture — Single Worker (Approach A)

One Hono Worker handles everything: auth, AI generation, Dynamic Worker spawning, frontend serving, and routing to generated apps.

```
InstaApp Worker (Hono)
├── GET  /              → Landing page (sign in prompt)
├── GET  /live/:id      → Serves generated app (shareable, no auth)
├── GET  /dashboard     → User's apps + prompt input (auth required)
├── POST /generate      → AI generates app → Dynamic Worker → D1 (auth required)
├── GET  /app/:id       → Embed page: code viewer + iframe preview (auth required)
├── DELETE /app/:id     → Delete app from D1 (auth required)
└── Clerk middleware on /dashboard/*, /generate, /app/*
```

### Why single Worker

- One deploy, one codebase
- Dynamic Workers handle isolation — generated apps run in separate V8 sandboxes
- For a weekend project, splitting into multiple Workers is unnecessary complexity
- Can split later if traffic demands it

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Hono (JSX, middleware, routing) |
| Auth | Clerk (@hono/clerk-auth, Google/GitHub social login) |
| AI | Workers AI (Llama 3.3 70B) |
| Sandboxing | Dynamic Workers (env.LOADER) |
| Database | D1 (SQLite — app metadata + code storage) |
| Runtime | Cloudflare Workers |

## Routes

### Public (no auth)

**GET /** — Landing page. Shows what InstaApp does, sign-in button (Clerk). Simple, clean, one CTA.

**GET /live/:id** — The shareable URL. Looks up the app ID, loads the Dynamic Worker via `LOADER.get()`, forwards the request. Returns whatever the generated app returns (usually HTML). No branding, no iframe — just the raw app. This is what people share on Twitter.

### Authenticated (Clerk middleware)

**GET /dashboard** — User's apps list + prompt input at the top. Shows all apps the user has created with prompt, creation date, and links to embed view and live URL.

**POST /generate** — Core endpoint. Accepts `{ prompt: string }`. Calls Workers AI to generate self-contained Worker code, validates it, stores in D1, warms the Dynamic Worker, returns `{ id, live_url, embed_url }`.

**GET /app/:id** — Creator's embed view. Shows the prompt, generated code (with syntax highlighting via inline CSS), and an iframe loading `/live/:id`. Only accessible by the app's creator (verified via user_id match).

**DELETE /app/:id** — Deletes the app from D1. Only accessible by the app's creator.

## Generation Pipeline

```
POST /generate { prompt: "a trivia game about space" }
    |
1. Clerk middleware → verify JWT → get user_id
    |
2. Validate prompt (non-empty, max 500 chars)
    |
3. Rate limit check (max 20 apps/day per user via D1 count query)
    |
4. Workers AI generates app code
    |  Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast
    |  See "System Prompt" section below
    |
5. Validate generated code
    |  - Strip markdown fences (```js ... ```) if present
    |  - Must contain "export default"
    |  - Must contain "fetch" (needs a fetch handler)
    |  - Max 50KB code size
    |
6. Generate app ID (nanoid, 8 chars)
    |
7. Store in D1: { id, user_id, prompt, code, created_at, updated_at }
    |
8. Return { id, live_url: "/live/{id}", embed_url: "/app/{id}" }
```

### System Prompt for Code Generation

```
You are a Cloudflare Worker code generator. Given a user's description of a micro web app, generate a single, self-contained Cloudflare Worker.

Rules:
- Export a default object with a fetch(request) handler
- Return an HTML Response with inline CSS and inline JavaScript
- Do NOT import any external modules or npm packages
- Do NOT use any Cloudflare bindings (no env.KV, env.D1, etc.)
- The app must be fully self-contained in one file
- Use modern, clean CSS (flexbox, grid, custom properties)
- Make it mobile-responsive
- Make it visually polished — use good typography, spacing, and color
- If the app needs external data, use fetch() to public APIs
- Always include a <meta name="viewport"> tag for mobile

Respond with ONLY the code. No explanations, no markdown fences, no comments outside the code.
```

### Constraints — No external dependencies

Generated code must be self-contained (no npm imports). This avoids needing `@cloudflare/worker-bundler` for runtime bundling, which would add complexity, latency, and failure modes. Vanilla JS covers 90% of use cases (HTML pages, forms, games, tools, visualizations). Can add bundler support as a v2 feature.

## Dynamic Worker Execution

When someone visits `/live/:id`:

```
GET /live/abc123
    |
1. env.LOADER.get("abc123", async () => {
    |    // callback only runs if isolate isn't warm
    |    const app = await getAppFromD1("abc123")
    |    if (!app) throw new Error("App not found")
    |    return {
    |      compatibilityDate: "2026-03-01",
    |      mainModule: "app.js",
    |      modules: { "app.js": app.code },
    |    }
    |  })
    |  // LOADER.get() returns a WorkerStub synchronously
    |  // D1 lookup only happens inside the callback, not on every request
    |
2. worker.getEntrypoint().fetch(request)
    |
3. Return response to user
```

### LOADER.get() vs LOADER.load()

`get(id, callback)` caches warm isolates by ID. The callback is only invoked when the isolate isn't already warm — so D1 is only queried on cold starts. `LOADER.get()` returns a `WorkerStub` **synchronously** (no await needed). Requests to the stub wait for the worker to load if the callback is still running. `load()` would create a fresh isolate per request, wasting startup time.

### Outbound Network Proxy

Generated apps need to fetch external APIs (weather, jokes, etc.), so we can't use `globalOutbound: null`. Instead, a proxy `WorkerEntrypoint` class filters requests. The proxy is wired via `ctx.exports`:

```typescript
// In the parent Worker
export class OutboundProxy extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    // filter and forward
  }
}

// When loading a Dynamic Worker, pass it via globalOutbound:
// globalOutbound: ctx.exports.OutboundProxy()
```

Note: `globalOutbound` wiring via `ctx.exports` requires the parent Worker to export the `OutboundProxy` class. The Dynamic Workers beta may have limitations on `globalOutbound` support — for v1, we launch without network restrictions and add the proxy once the API stabilizes. This is a known security gap documented in the V2 ideas.

**Blocked destinations** (when proxy is active):
- `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]` (loopback)
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918 private)
- `169.254.169.254` (AWS metadata)
- `metadata.google.internal` (GCP metadata)

Everything else is allowed. The proxy prevents SSRF attacks while letting generated apps call public APIs.

### CPU Limits

Dynamic Workers inherit the parent's CPU limits (30 seconds on paid plan). Infinite loops or CPU abuse in generated code hits the limit and Cloudflare kills the isolate automatically. No extra protection needed.

## Data Model (D1)

```sql
CREATE TABLE IF NOT EXISTS apps (
  id          TEXT PRIMARY KEY,       -- nanoid, 8 chars
  user_id     TEXT NOT NULL,          -- Clerk user ID
  prompt      TEXT NOT NULL,          -- user's description
  code        TEXT NOT NULL,          -- generated Worker code
  created_at  INTEGER NOT NULL,       -- unix timestamp
  updated_at  INTEGER NOT NULL        -- unix timestamp
);

CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
```

Single table. Simple. The code is stored as text — typically 2-10KB per app.

### Visibility

- Apps are **shareable by default** — `/live/:id` works for anyone with the link
- Apps are **unlisted** — no public gallery or search. Only the creator knows the URL unless they share it
- No paid tier — v1 simplicity

## Frontend

All pages served by Hono with JSX. No separate frontend build. Inline CSS for simplicity.

### Landing page (GET /)

Clean, minimal. Shows:
- InstaApp logo/title
- One-line description: "Describe an app. Get a live URL."
- Sign in button (Clerk)
- 2-3 example prompts as inspiration

### Dashboard (GET /dashboard)

- Prompt input at the top (textarea + "Generate" button)
- Loading state while generating (spinner + "Generating your app...")
- List of user's created apps below, each showing:
  - The prompt text
  - Created date
  - "View" link → `/app/:id`
  - "Live URL" link → `/live/:id` (with copy button)
  - "Delete" button

### Embed view (GET /app/:id)

Split layout:
- Left/top: prompt text + generated code (with syntax highlighting via inline CSS)
- Right/bottom: iframe loading `/live/:id`
- Copy URL button for the live link

### Design aesthetic

Clean, minimal, dark theme. Developer-oriented. No flashy gradients — let the generated apps be the visual star. Think: VS Code meets a simple dashboard.

## Error Handling

| Failure | Handling |
|---|---|
| AI generates invalid code (no export default) | Return 422 with "Generation failed — try rephrasing your prompt" |
| AI rate limited (429) | Return 503 with "AI is busy — try again in a moment" |
| Generated app throws at runtime | Dynamic Worker returns 500; `/live/:id` shows "This app encountered an error" |
| App ID not found | `/live/:id` returns 404 with "App not found" |
| D1 unreachable | Return 503 with "Service temporarily unavailable" |

### Rate limiting

Clerk handles authentication. For abuse prevention:
- Max 20 app generations per user per day (checked via D1 count query)
- Max 50KB generated code size
- Max 500 char prompt length

## Authentication Flow

1. User visits `/` → sees landing page with "Sign in" button
2. Clerk's hosted UI handles Google/GitHub OAuth
3. On success, Clerk sets a session cookie/JWT
4. Subsequent requests to auth'd routes include the JWT
5. `@hono/clerk-auth` middleware verifies the JWT and attaches `userId` to context
6. Worker never handles passwords, tokens, or OAuth flows directly

### Clerk Configuration

- Create a Clerk application at clerk.com
- Enable Google and GitHub social login
- Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` as Worker secrets
- Frontend loads ClerkJS from CDN via `<script>` tag in Hono JSX pages (no npm package for frontend — `@hono/clerk-auth` only handles server-side JWT verification)
- The landing page links to `/dashboard`; Clerk middleware on `/dashboard` redirects to Clerk's hosted sign-in page if not authenticated

## Testing Strategy

### Unit tests (Vitest)

- Prompt validation: empty, too long, valid
- Code validation: missing export, missing fetch, valid, markdown fence stripping
- D1 operations: store app, get app, list by user, delete, rate limit check

### Integration tests

- Full generation pipeline with mocked AI response
- Route auth enforcement: auth'd routes return 401 without token
- `/live/:id` routing to Dynamic Worker

### Manual end-to-end ("tweet test")

1. Deploy to Cloudflare
2. Sign in with GitHub
3. Type: "A trivia game about space with 5 questions"
4. Click generate → URL appears in <2 seconds
5. Open live URL → playable trivia game
6. Open live URL on phone → mobile-responsive
7. Share URL with a friend → they can play without signing in

## Cost Estimate

| Service | Free Tier | Expected Usage | Cost |
|---|---|---|---|
| Workers | 100k req/day | UI + API + live apps | $0 |
| Workers AI | 10k neurons/day | ~3-5 generations/day on free tier (Llama 3.3 70B uses ~2-4k neurons/generation). Heavy testing may exceed free tier — use a smaller model like `@cf/meta/llama-3.2-3b-instruct` for iteration, switch to 70B for production. | $0-0.50/day |
| D1 | 5M reads/day, 100k writes/day | App lookups + stores | $0 |
| Dynamic Workers | 1,000 unique/month (beta: free) | ~20 apps/day | $0 (beta) |
| Clerk | 10k MAU free | Personal use | $0 |

**Estimated total: $5/month** (Workers Paid plan base). All services within free tier for personal/demo usage.

## Wrangler Configuration

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

## V2 Ideas

- **npm dependency support** — use `@cloudflare/worker-bundler` for generated apps that need external packages
- **Remix/fork** — let users fork someone else's app and modify the prompt
- **Public gallery** — curated showcase of the best generated apps
- **Custom domains** — point your own domain to a generated app
- **Paid tier** — more generations per day, app analytics, persistent apps
- **Templates** — pre-built starting points ("poll", "countdown", "quiz") that the AI customizes
