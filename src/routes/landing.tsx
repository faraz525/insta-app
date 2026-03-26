import { Hono } from "hono"
import type { Env } from "../types"

const landing = new Hono<{ Bindings: Env }>()

landing.get("/", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>InstaApp</title>
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
            max-width: 600px;
            text-align: center;
          }
          h1 {
            font-size: 3rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.75rem;
            letter-spacing: -0.02em;
          }
          .tagline {
            font-size: 1.25rem;
            color: #888;
            margin-bottom: 2.5rem;
          }
          .cta {
            display: inline-block;
            padding: 0.875rem 2rem;
            background: #ffffff;
            color: #0a0a0a;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            transition: opacity 0.15s;
          }
          .cta:hover { opacity: 0.85; }
          .examples {
            margin-top: 3rem;
            text-align: left;
          }
          .examples h3 {
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #666;
            margin-bottom: 1rem;
          }
          .example {
            background: #161616;
            border: 1px solid #262626;
            border-radius: 8px;
            padding: 0.875rem 1rem;
            margin-bottom: 0.5rem;
            color: #aaa;
            font-size: 0.9rem;
          }
        `}</style>
      </head>
      <body>
        <div class="container">
          <h1>InstaApp</h1>
          <p class="tagline">Describe an app. Get a live URL.</p>
          <a href="/sign-in" class="cta">Get Started</a>
          <div class="examples">
            <h3>Try something like...</h3>
            <div class="example">"A trivia game about space with 5 questions"</div>
            <div class="example">"A pomodoro timer with start, pause, and reset"</div>
            <div class="example">"A color palette generator with copy-to-clipboard"</div>
          </div>
        </div>
      </body>
    </html>
  )
})

export default landing
