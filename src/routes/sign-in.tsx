import { Hono } from "hono"
import type { Env } from "../types"

const signIn = new Hono<{ Bindings: Env }>()

signIn.get("/sign-in", (c) => {
  const publishableKey = c.env.CLERK_PUBLISHABLE_KEY

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sign In - InstaApp</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .container {
            max-width: 400px;
            text-align: center;
            width: 100%;
          }
          h1 {
            font-size: 2rem;
            color: #fff;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            color: #888;
            margin-bottom: 2rem;
          }
          #clerk-sign-in {
            display: flex;
            justify-content: center;
          }
          .back-link {
            margin-top: 2rem;
            color: #666;
            text-decoration: none;
            font-size: 0.9rem;
          }
          .back-link:hover { color: #888; }
        `}</style>
      </head>
      <body>
        <div class="container">
          <h1>InstaApp</h1>
          <p class="subtitle">Sign in to start creating</p>
          <div id="clerk-sign-in"></div>
          <a href="/" class="back-link">Back to home</a>
        </div>
        <script
          data-clerk-publishable-key={publishableKey}
          src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
          type="text/javascript"
        ></script>
        <script>{`
          window.addEventListener('load', async () => {
            await window.Clerk.load();
            if (window.Clerk.user) {
              window.location.href = '/dashboard';
              return;
            }
            window.Clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
              afterSignInUrl: '/dashboard',
              afterSignUpUrl: '/dashboard',
            });
          });
        `}</script>
      </body>
    </html>
  )
})

export default signIn
