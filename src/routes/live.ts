import { Hono } from "hono"
import type { Env } from "../types"
import { executeApp } from "../services/sandbox"

const live = new Hono<{ Bindings: Env }>()

live.get("/live/:id", async (c) => {
  const appId = c.req.param("id")

  try {
    const response = await executeApp(c.env, appId, c.req.raw)
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"

    if (message === "App not found") {
      return c.html(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0a0a; color: #888;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; margin: 0;
            }
          </style>
        </head>
        <body><p>App not found.</p></body>
        </html>`,
        404
      )
    }

    return c.html(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; color: #888;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; margin: 0;
          }
        </style>
      </head>
      <body><p>This app encountered an error.</p></body>
      </html>`,
      500
    )
  }
})

export default live
