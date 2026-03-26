import { Hono } from "hono"
import { getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { getAppById } from "../db/apps"

const appView = new Hono<{ Bindings: Env }>()

appView.get("/app/:id", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId
  const appId = c.req.param("id")

  const app = await getAppById(c.env.DB, appId)

  if (!app) {
    return c.html(
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Not Found - InstaApp</title>
          <style>{`
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a; color: #888;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; margin: 0;
            }
          `}</style>
        </head>
        <body><p>App not found.</p></body>
      </html>,
      404
    )
  }

  if (app.user_id !== userId) {
    return c.html(
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Forbidden - InstaApp</title>
          <style>{`
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a; color: #888;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; margin: 0;
            }
          `}</style>
        </head>
        <body><p>You do not have access to this app.</p></body>
      </html>,
      403
    )
  }

  const liveUrl = `/live/${app.id}`

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{app.prompt} - InstaApp</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
          }
          .header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #1a1a1a;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .header a { color: #888; text-decoration: none; font-size: 0.9rem; }
          .header h1 { font-size: 1rem; color: #fff; font-weight: 600; }
          .prompt-text {
            color: #888;
            font-size: 0.85rem;
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .copy-btn {
            padding: 0.375rem 0.75rem;
            background: #222;
            border: 1px solid #333;
            color: #ccc;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
          }
          .copy-btn:hover { background: #333; }
          .split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            height: calc(100vh - 60px);
          }
          @media (max-width: 768px) {
            .split {
              grid-template-columns: 1fr;
              grid-template-rows: 1fr 1fr;
            }
          }
          .code-panel {
            overflow: auto;
            border-right: 1px solid #1a1a1a;
            padding: 1rem;
          }
          .code-panel pre {
            background: #111;
            border-radius: 8px;
            padding: 1rem;
            overflow-x: auto;
            font-size: 0.8rem;
            line-height: 1.5;
            color: #c0c0c0;
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          }
          .preview-panel {
            background: #fff;
          }
          .preview-panel iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        `}</style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <a href="/dashboard">← Dashboard</a>
            <h1>App Preview</h1>
            <span class="prompt-text">{app.prompt}</span>
          </div>
          <button class="copy-btn" id="copy-url" data-url={liveUrl}>
            Copy Live URL
          </button>
        </div>
        <div class="split">
          <div class="code-panel">
            <pre><code>{app.code}</code></pre>
          </div>
          <div class="preview-panel">
            <iframe src={liveUrl}></iframe>
          </div>
        </div>
        <script>{`
          document.getElementById('copy-url').addEventListener('click', function() {
            const url = window.location.origin + this.getAttribute('data-url');
            navigator.clipboard.writeText(url).then(() => {
              this.textContent = 'Copied!';
              setTimeout(() => { this.textContent = 'Copy Live URL'; }, 2000);
            });
          });
        `}</script>
      </body>
    </html>
  )
})

export default appView
