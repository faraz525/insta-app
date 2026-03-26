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

function AppCard({ app }: { app: AppRecord }) {
  return (
    <div class="app-card">
      <p class="app-prompt">{app.prompt}</p>
      <div class="app-meta">
        <span class="app-date">{formatDate(app.created_at)}</span>
        <div class="app-actions">
          <a href={`/app/${app.id}`} class="btn btn-small">View</a>
          <a href={`/live/${app.id}`} class="btn btn-small btn-outline" target="_blank">
            Live URL
          </a>
          <button class="btn btn-small btn-danger" data-delete-id={app.id}>
            Delete
          </button>
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
        <title>Dashboard - InstaApp</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
            padding: 2rem;
          }
          .header {
            max-width: 800px;
            margin: 0 auto 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header h1 { font-size: 1.5rem; color: #fff; }
          .header a { color: #888; text-decoration: none; }
          .container { max-width: 800px; margin: 0 auto; }
          .generate-form {
            background: #161616;
            border: 1px solid #262626;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }
          textarea {
            width: 100%;
            min-height: 80px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #e0e0e0;
            font-size: 0.95rem;
            padding: 0.75rem;
            resize: vertical;
            font-family: inherit;
          }
          textarea:focus { outline: none; border-color: #555; }
          .btn {
            display: inline-block;
            padding: 0.625rem 1.25rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            border: none;
            transition: opacity 0.15s;
          }
          .btn:hover { opacity: 0.85; }
          .btn-primary { background: #fff; color: #0a0a0a; margin-top: 0.75rem; }
          .btn-small { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
          .btn-outline { background: transparent; color: #888; border: 1px solid #333; }
          .btn-danger { background: transparent; color: #e55; border: 1px solid #e55; }
          #status {
            margin-top: 0.75rem;
            font-size: 0.9rem;
            color: #888;
          }
          #result {
            margin-top: 0.75rem;
          }
          #result a {
            color: #6cf;
            text-decoration: none;
          }
          .apps-list { margin-top: 1rem; }
          .apps-list h2 {
            font-size: 1.1rem;
            color: #888;
            margin-bottom: 1rem;
            font-weight: 500;
          }
          .app-card {
            background: #161616;
            border: 1px solid #262626;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
          }
          .app-prompt {
            color: #ccc;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
          }
          .app-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .app-date { color: #666; font-size: 0.8rem; }
          .app-actions { display: flex; gap: 0.375rem; }
          .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: #555;
          }
        `}</style>
      </head>
      <body>
        <div class="header">
          <h1>InstaApp</h1>
          <a href="/">Home</a>
        </div>
        <div class="container">
          <div class="generate-form">
            <textarea
              id="prompt"
              placeholder="Describe your micro app... (e.g., 'A trivia game about space')"
              maxlength={500}
            ></textarea>
            <button class="btn btn-primary" id="generate-btn">Generate</button>
            <div id="status"></div>
            <div id="result"></div>
          </div>

          <div class="apps-list">
            <h2>Your Apps</h2>
            {apps.length === 0 ? (
              <div class="empty-state">No apps yet. Describe one above to get started.</div>
            ) : (
              apps.map((app) => <AppCard app={app} />)
            )}
          </div>
        </div>

        <script>{`
          const generateBtn = document.getElementById('generate-btn');
          const promptEl = document.getElementById('prompt');
          const statusEl = document.getElementById('status');
          const resultEl = document.getElementById('result');

          generateBtn.addEventListener('click', async () => {
            const prompt = promptEl.value.trim();
            if (!prompt) return;

            generateBtn.disabled = true;
            statusEl.textContent = 'Generating your app...';
            resultEl.textContent = '';

            try {
              const res = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
              });
              const data = await res.json();

              if (!res.ok) {
                statusEl.textContent = data.error || 'Generation failed';
                return;
              }

              statusEl.textContent = 'App created!';
              const link = document.createElement('a');
              link.href = data.embed_url;
              link.textContent = 'View your app →';
              resultEl.textContent = '';
              resultEl.appendChild(link);

              setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
              statusEl.textContent = 'Something went wrong. Try again.';
            } finally {
              generateBtn.disabled = false;
            }
          });

          document.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-delete-id');
              if (!confirm('Delete this app?')) return;

              try {
                const res = await fetch('/app/' + id, { method: 'DELETE' });
                if (res.ok) {
                  btn.closest('.app-card').remove();
                }
              } catch (err) {
                // Silently fail delete
              }
            });
          });
        `}</script>
      </body>
    </html>
  )
})

export default dashboard
