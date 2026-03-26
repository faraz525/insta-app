import { Hono } from "hono"
import type { Env } from "../types"

const signIn = new Hono<{ Bindings: Env }>()

signIn.get("/sign-in", (c) => {
  const publishableKey = c.env.CLERK_PUBLISHABLE_KEY

  // Clerk's embedded sign-in widget loaded via their CDN
  // The script initializes Clerk with publishableKey and mounts the SignIn component
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - InstaApp</title>
  <style>
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
      max-width: 500px;
      text-align: center;
      width: 100%;
    }
    h1 { font-size: 2rem; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: #888; margin-bottom: 2rem; }
    #clerk-mount {
      display: flex;
      justify-content: center;
      min-height: 200px;
      align-items: center;
    }
    .loading { color: #666; }
    .error { color: #e55; margin-top: 1rem; font-size: 0.9rem; }
    .back-link {
      display: inline-block;
      margin-top: 2rem;
      color: #666;
      text-decoration: none;
    }
    .back-link:hover { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>InstaApp</h1>
    <p class="subtitle">Sign in to start creating</p>
    <div id="clerk-mount"><p class="loading">Loading...</p></div>
    <div id="error"></div>
    <a href="/" class="back-link">Back to home</a>
  </div>
  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${publishableKey}"
    src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@4/dist/clerk.browser.js"
    onload="initClerk()"
    onerror="showError('Failed to load authentication script')"
  ></script>
  <script>
    function showError(msg) {
      document.getElementById('clerk-mount').textContent = '';
      var el = document.getElementById('error');
      el.className = 'error';
      el.textContent = msg;
    }

    async function initClerk() {
      try {
        var clerk = window.Clerk;
        if (!clerk) { showError('Clerk not available'); return; }

        await clerk.load();

        if (clerk.user) {
          window.location.href = '/dashboard';
          return;
        }

        document.getElementById('clerk-mount').textContent = '';
        clerk.mountSignIn(document.getElementById('clerk-mount'), {
          afterSignInUrl: '/dashboard',
          afterSignUpUrl: '/dashboard',
        });
      } catch(e) {
        showError('Sign-in error: ' + e.message);
        console.error(e);
      }
    }
  </script>
</body>
</html>`)
})

export default signIn
