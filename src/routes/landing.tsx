import { Hono } from "hono"
import type { Env } from "../types"

const landing = new Hono<{ Bindings: Env }>()

landing.get("/", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>InstaApp — Describe an app. Get a live URL.</title>
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
            --border: #e7e1d9;
            --border-dark: #d6cfc5;
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
            align-items: center;
            justify-content: center;
            padding: 2.5rem 2rem;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .container {
            max-width: 720px;
            width: 100%;
            text-align: center;
          }

          .eyebrow {
            font-family: var(--font-sans);
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--text-tertiary);
            margin-bottom: 1.75rem;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
          }

          h1 {
            font-family: var(--font-serif);
            font-size: clamp(3.5rem, 8vw, 5.5rem);
            font-weight: 900;
            color: var(--text);
            letter-spacing: -0.035em;
            line-height: 1;
            margin-bottom: 1.5rem;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
          }

          .rule {
            width: 56px;
            height: 3px;
            background: var(--accent);
            margin: 0 auto 1.75rem;
            border: none;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
          }

          .tagline {
            font-family: var(--font-serif);
            font-style: italic;
            font-size: clamp(1.15rem, 2.5vw, 1.5rem);
            color: var(--text-secondary);
            margin-bottom: 2.75rem;
            line-height: 1.45;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
          }

          .cta {
            display: inline-block;
            padding: 0.95rem 2.75rem;
            background: var(--accent);
            color: #ffffff;
            text-decoration: none;
            border-radius: 3px;
            font-family: var(--font-sans);
            font-weight: 600;
            font-size: 0.95rem;
            letter-spacing: 0.04em;
            transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
          }
          .cta:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(196, 53, 10, 0.2);
          }
          .cta:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(196, 53, 10, 0.15);
          }

          .examples {
            margin-top: 4.5rem;
            text-align: left;
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both;
          }

          .examples-label {
            font-family: var(--font-sans);
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--text-tertiary);
            margin-bottom: 1.25rem;
            padding-bottom: 0.625rem;
            border-bottom: 1px solid var(--border);
          }

          .examples-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
          }

          .example-item {
            padding: 1.125rem 1.5rem;
            border-right: 1px solid var(--border);
            transition: background 0.2s ease;
          }
          .example-item:first-child { padding-left: 0.5rem; }
          .example-item:last-child {
            border-right: none;
            padding-right: 0.5rem;
          }
          .example-item:hover { background: rgba(0, 0, 0, 0.015); }

          .example-category {
            font-family: var(--font-sans);
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 0.625rem;
          }

          .example-text {
            font-family: var(--font-mono);
            font-size: 0.825rem;
            color: var(--text-secondary);
            line-height: 1.55;
          }

          .footer-note {
            margin-top: 3.5rem;
            font-family: var(--font-serif);
            font-style: italic;
            font-size: 0.875rem;
            color: var(--text-tertiary);
            opacity: 0;
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.85s both;
          }

          @keyframes reveal {
            from {
              opacity: 0;
              transform: translateY(18px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (max-width: 640px) {
            body { padding: 2rem 1.25rem; }

            .examples-grid {
              grid-template-columns: 1fr;
            }
            .example-item {
              border-right: none;
              border-bottom: 1px solid var(--border);
              padding: 1rem 0.25rem;
            }
            .example-item:first-child { padding-left: 0.25rem; }
            .example-item:last-child {
              border-bottom: none;
              padding-right: 0.25rem;
            }
          }
        `}</style>
      </head>
      <body>
        <div class="container">
          <p class="eyebrow">Est. 2026</p>
          <h1>InstaApp</h1>
          <hr class="rule" />
          <p class="tagline">Describe an app. Get a live URL.</p>
          <a href="/sign-in" class="cta">Get Started</a>

          <div class="examples">
            <p class="examples-label">Try something like</p>
            <div class="examples-grid">
              <div class="example-item">
                <p class="example-category">Games</p>
                <p class="example-text">
                  A trivia game about space with 5 questions
                </p>
              </div>
              <div class="example-item">
                <p class="example-category">Tools</p>
                <p class="example-text">
                  A pomodoro timer with start, pause, and reset
                </p>
              </div>
              <div class="example-item">
                <p class="example-category">Creative</p>
                <p class="example-text">
                  A color palette generator with copy-to-clipboard
                </p>
              </div>
            </div>
          </div>

          <p class="footer-note">Made for makers.</p>
        </div>
      </body>
    </html>
  )
})

export default landing
