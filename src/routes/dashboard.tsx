import { Hono } from "hono"
import { getAuth } from "@hono/clerk-auth"
import type { Env, AppRecord } from "../types"
import { getAppsByUser } from "../db/apps"

const dashboard = new Hono<{ Bindings: Env }>()

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function AppCard({ app, index }: { app: AppRecord; index: number }) {
  const delay = `${0.15 + index * 0.06}s`
  return (
    <div class="app-card" style={`animation-delay: ${delay}`}>
      <div class="app-card-inner">
        <p class="app-prompt">{app.prompt}</p>
        <div class="app-meta">
          <span class="app-date">{formatDate(app.created_at)}</span>
          <div class="app-actions">
            <a href={`/app/${app.id}`} class="btn btn-teal">View</a>
            <a
              href={`/live/${app.id}`}
              class="btn btn-outline"
              target="_blank"
              rel="noopener"
            >
              Live URL &#8599;
            </a>
            <button class="btn btn-danger" data-delete-id={app.id}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

dashboard.get("/dashboard", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId ?? ""
  const apps = await getAppsByUser(c.env.DB, userId)

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dashboard — InstaApp</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@400;500;600&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

          :root {
            --bg: #f7f4ef;
            --surface: #ffffff;
            --text: #1c1917;
            --text-secondary: #78716c;
            --text-tertiary: #a8a29e;
            --accent: #c4350a;
            --accent-hover: #a02d08;
            --teal: #115e59;
            --teal-hover: #0d4f4a;
            --border: #e7e1d9;
            --border-dark: #d6cfc5;
            --code-bg: #1c1917;
            --code-text: #e7e1d9;
            --danger: #b91c1c;
            --danger-hover: #991b1b;
            --shadow-sm: 0 1px 2px rgba(28,25,23,0.04);
            --shadow-md: 0 4px 12px rgba(28,25,23,0.07);
            --shadow-lg: 0 8px 24px rgba(28,25,23,0.1);
            --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
            --font-sans: 'Source Sans 3', 'Segoe UI', sans-serif;
            --font-mono: 'Source Code Pro', 'Menlo', 'Consolas', monospace;
          }

          body {
            font-family: var(--font-sans);
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* ── Header ── */
          .header {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 2rem 1.5rem;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
          }

          .header-logo {
            font-family: var(--font-serif);
            font-size: 1.6rem;
            font-weight: 900;
            color: var(--text);
            text-decoration: none;
            letter-spacing: -0.02em;
          }

          .header-nav a {
            font-family: var(--font-sans);
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-secondary);
            text-decoration: none;
            transition: color 0.15s ease;
          }
          .header-nav a:hover { color: var(--text); }

          /* ── Main Container ── */
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }

          /* ── Generate Form ── */
          .generate-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 2rem;
            margin-bottom: 3rem;
            box-shadow: var(--shadow-sm);
            opacity: 0;
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
          }

          .generate-label {
            font-family: var(--font-serif);
            font-style: italic;
            font-size: 1.15rem;
            color: var(--text-secondary);
            margin-bottom: 1.25rem;
          }

          textarea {
            width: 100%;
            min-height: 88px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            padding: 0.875rem 1rem;
            resize: vertical;
            line-height: 1.55;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          textarea::placeholder { color: var(--text-tertiary); }
          textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(196, 53, 10, 0.06);
          }

          .form-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 1rem;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .char-count {
            font-size: 0.75rem;
            color: var(--text-tertiary);
            font-variant-numeric: tabular-nums;
          }

          .btn-generate {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.7rem 1.75rem;
            background: var(--accent);
            color: #ffffff;
            border: none;
            border-radius: 3px;
            font-family: var(--font-sans);
            font-weight: 600;
            font-size: 0.875rem;
            letter-spacing: 0.03em;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          .btn-generate:hover:not(:disabled) {
            background: var(--accent-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(196, 53, 10, 0.2);
          }
          .btn-generate:active:not(:disabled) {
            transform: translateY(0);
          }
          .btn-generate:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .progress-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            background: rgba(255,255,255,0.5);
            width: 0;
            transition: width 0.3s ease;
          }
          .btn-generate.loading .progress-bar {
            animation: loadProgress 10s cubic-bezier(0.1, 0.5, 0.2, 1) both;
          }

          @keyframes loadProgress {
            0% { width: 0; }
            15% { width: 25%; }
            40% { width: 55%; }
            70% { width: 78%; }
            100% { width: 95%; }
          }

          #status {
            margin-top: 0.875rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-style: italic;
          }

          #result {
            margin-top: 0.75rem;
          }
          #result a {
            color: var(--teal);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: color 0.15s ease;
          }
          #result a:hover { color: var(--teal-hover); }

          /* ── Apps Section ── */
          .apps-section {
            opacity: 0;
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
          }

          .section-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .section-label {
            font-family: var(--font-sans);
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--text-tertiary);
            white-space: nowrap;
          }

          .section-rule {
            flex: 1;
            height: 1px;
            background: var(--border);
            border: none;
          }

          .app-card {
            opacity: 0;
            animation: cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          .app-card-inner {
            background: var(--surface);
            border: 1px solid var(--border);
            border-left: 3px solid transparent;
            border-radius: 4px;
            padding: 1.125rem 1.25rem;
            margin-bottom: 0.625rem;
            transition: border-left-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          }
          .app-card-inner:hover {
            border-left-color: var(--accent);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }

          .app-prompt {
            font-family: var(--font-serif);
            font-size: 1rem;
            color: var(--text);
            margin-bottom: 0.75rem;
            line-height: 1.4;
          }

          .app-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.625rem;
          }

          .app-date {
            font-size: 0.75rem;
            font-weight: 500;
            letter-spacing: 0.04em;
            color: var(--text-tertiary);
            font-variant-numeric: tabular-nums;
          }

          .app-actions {
            display: flex;
            gap: 0.375rem;
          }

          /* ── Buttons ── */
          .btn {
            display: inline-block;
            padding: 0.35rem 0.75rem;
            border-radius: 3px;
            font-family: var(--font-sans);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid transparent;
            transition: all 0.15s ease;
            letter-spacing: 0.02em;
          }

          .btn-teal {
            background: var(--teal);
            color: #ffffff;
            border-color: var(--teal);
          }
          .btn-teal:hover {
            background: var(--teal-hover);
            border-color: var(--teal-hover);
          }

          .btn-outline {
            background: transparent;
            color: var(--teal);
            border-color: var(--border-dark);
          }
          .btn-outline:hover {
            border-color: var(--teal);
            background: rgba(17, 94, 89, 0.04);
          }

          .btn-danger {
            background: transparent;
            color: var(--text-tertiary);
            border-color: transparent;
          }
          .btn-danger:hover {
            color: var(--danger);
            border-color: var(--danger);
            background: rgba(185, 28, 28, 0.04);
          }

          /* ── Empty State ── */
          .empty-state {
            text-align: center;
            padding: 3.5rem 1.5rem;
            color: var(--text-tertiary);
            font-family: var(--font-serif);
            font-style: italic;
            font-size: 1rem;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes cardReveal {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (max-width: 640px) {
            .header { padding: 1.5rem 1.25rem 1.25rem; }
            .container { padding: 1.5rem 1.25rem; }
            .generate-section { padding: 1.5rem; }
            .app-meta { flex-direction: column; align-items: flex-start; }
          }
        `}</style>
      </head>
      <body>
        <div class="header">
          <a href="/" class="header-logo">InstaApp</a>
          <nav class="header-nav">
            <a href="/">Home</a>
          </nav>
        </div>

        <div class="container">
          <div class="generate-section">
            <p class="generate-label">What would you like to create?</p>
            <textarea
              id="prompt"
              placeholder="Describe your micro app... e.g. &quot;A trivia game about space&quot;"
              maxlength={500}
            ></textarea>
            <div class="form-footer">
              <span class="char-count" id="char-count">0 / 500</span>
              <button class="btn-generate" id="generate-btn">
                Generate
                <span class="progress-bar"></span>
              </button>
            </div>
            <div id="status"></div>
            <div id="result"></div>
          </div>

          <div class="apps-section">
            <div class="section-header">
              <span class="section-label">Your Apps</span>
              <hr class="section-rule" />
            </div>

            {apps.length === 0 ? (
              <div class="empty-state">
                Your collection is empty. Describe an app above to publish your
                first creation.
              </div>
            ) : (
              apps.map((app, i) => <AppCard app={app} index={i} />)
            )}
          </div>
        </div>

        <script src="/dashboard.js"></script>
      </body>
    </html>
  )
})

export default dashboard
