import { Hono } from "hono"
import { getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { getAppById, deleteApp } from "../db/apps"

const appView = new Hono<{ Bindings: Env }>()

function ErrorPage({
  title,
  message,
  status,
}: {
  title: string
  message: string
  status: number
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — InstaApp</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
            background: #f7f4ef;
            color: #78716c;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
            -webkit-font-smoothing: antialiased;
          }
          .error-code {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 4rem;
            font-weight: 900;
            color: #1c1917;
            letter-spacing: -0.03em;
            margin-bottom: 0.5rem;
          }
          .error-rule {
            width: 40px;
            height: 2px;
            background: #c4350a;
            border: none;
            margin: 0 auto 1rem;
          }
          .error-message {
            font-family: 'Playfair Display', Georgia, serif;
            font-style: italic;
            font-size: 1.1rem;
            color: #78716c;
            margin-bottom: 2rem;
          }
          .back-link {
            font-size: 0.85rem;
            font-weight: 600;
            color: #115e59;
            text-decoration: none;
            transition: color 0.15s ease;
          }
          .back-link:hover { color: #0d4f4a; }
        `}</style>
      </head>
      <body>
        <p class="error-code">{status}</p>
        <hr class="error-rule" />
        <p class="error-message">{message}</p>
        <a href="/dashboard" class="back-link">&#8592; Back to Dashboard</a>
      </body>
    </html>
  )
}

appView.get("/app/:id", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId
  const appId = c.req.param("id")

  const app = await getAppById(c.env.DB, appId)

  if (!app) {
    return c.html(<ErrorPage title="Not Found" message="This app could not be found." status={404} />, 404)
  }

  if (app.user_id !== userId) {
    return c.html(
      <ErrorPage title="Forbidden" message="You do not have access to this app." status={403} />,
      403
    )
  }

  const liveUrl = `/live/${app.id}`

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{app.prompt} — InstaApp</title>
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
            --teal: #115e59;
            --teal-hover: #0d4f4a;
            --border: #e7e1d9;
            --code-bg: #1c1917;
            --code-surface: #252220;
            --code-text: #e7e1d9;
            --code-text-muted: #8a8279;
            --font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
            --font-sans: 'Source Sans 3', 'Segoe UI', sans-serif;
            --font-mono: 'Source Code Pro', 'Menlo', 'Consolas', monospace;
          }

          body {
            font-family: var(--font-sans);
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* ── Header ── */
          .header {
            padding: 0.875rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
            background: var(--surface);
            flex-shrink: 0;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            min-width: 0;
          }

          .back-link {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--teal);
            text-decoration: none;
            white-space: nowrap;
            transition: color 0.15s ease;
          }
          .back-link:hover { color: var(--teal-hover); }

          .header-divider {
            width: 1px;
            height: 18px;
            background: var(--border);
            flex-shrink: 0;
          }

          .prompt-text {
            font-family: var(--font-serif);
            font-style: italic;
            color: var(--text-secondary);
            font-size: 0.85rem;
            max-width: 420px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .copy-btn {
            padding: 0.4rem 0.875rem;
            background: var(--teal);
            border: none;
            color: #ffffff;
            border-radius: 3px;
            cursor: pointer;
            font-family: var(--font-sans);
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            transition: background 0.15s ease, transform 0.15s ease;
          }
          .copy-btn:hover {
            background: var(--teal-hover);
            transform: translateY(-1px);
          }
          .copy-btn:active { transform: translateY(0); }
          .copy-btn.copied {
            background: #16a34a;
          }

          /* ── Split Layout ── */
          .split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            flex: 1;
            min-height: 0;
          }

          /* ── Panel Labels ── */
          .panel-label {
            font-family: var(--font-sans);
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            padding: 0.625rem 1.25rem;
            flex-shrink: 0;
          }

          /* ── Code Panel ── */
          .code-panel {
            display: flex;
            flex-direction: column;
            background: var(--code-bg);
            border-right: 1px solid #2a2620;
            min-height: 0;
          }

          .code-panel .panel-label {
            color: var(--code-text-muted);
            border-bottom: 1px solid #2a2620;
          }

          .code-scroll {
            flex: 1;
            overflow: auto;
            padding: 1rem 1.25rem;
          }

          .code-scroll pre {
            margin: 0;
            font-family: var(--font-mono);
            font-size: 0.78rem;
            line-height: 1.65;
            color: var(--code-text);
            white-space: pre-wrap;
            word-break: break-word;
            tab-size: 2;
          }

          /* ── Preview Panel ── */
          .preview-panel {
            display: flex;
            flex-direction: column;
            background: var(--surface);
            min-height: 0;
          }

          .preview-panel .panel-label {
            color: var(--text-tertiary);
            border-bottom: 1px solid var(--border);
            background: var(--bg);
          }

          .preview-frame {
            flex: 1;
            min-height: 0;
          }

          .preview-frame iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }

          @media (max-width: 768px) {
            .split {
              grid-template-columns: 1fr;
              grid-template-rows: 1fr 1fr;
            }
            .code-panel { border-right: none; border-bottom: 1px solid #2a2620; }
            .header-left { gap: 0.75rem; }
            .prompt-text { max-width: 200px; }
          }
        `}</style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <a href="/dashboard" class="back-link">&#8592; Dashboard</a>
            <span class="header-divider"></span>
            <span class="prompt-text">{app.prompt}</span>
          </div>
          <div class="header-right">
            <button class="copy-btn" id="copy-url" data-url={liveUrl}>
              Copy Live URL
            </button>
          </div>
        </div>

        <div class="split">
          <div class="code-panel">
            <div class="panel-label">Source</div>
            <div class="code-scroll">
              <pre><code>{app.code}</code></pre>
            </div>
          </div>
          <div class="preview-panel">
            <div class="panel-label">Preview</div>
            <div class="preview-frame">
              <iframe src={liveUrl}></iframe>
            </div>
          </div>
        </div>

        <script>{`
          document.getElementById('copy-url').addEventListener('click', function() {
            const btn = this;
            const url = window.location.origin + btn.getAttribute('data-url');
            navigator.clipboard.writeText(url).then(() => {
              btn.textContent = 'Copied!';
              btn.classList.add('copied');
              setTimeout(() => {
                btn.textContent = 'Copy Live URL';
                btn.classList.remove('copied');
              }, 2000);
            });
          });
        `}</script>
      </body>
    </html>
  )
})

// Delete handler on the same path — must be in same sub-router as GET /app/:id
appView.delete("/app/:id", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId
  if (!userId) return c.json({ error: "Unauthorized" }, 401)

  const appId = c.req.param("id")
  await deleteApp(c.env.DB, appId, userId)
  return c.json({ success: true })
})

export default appView
