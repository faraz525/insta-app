import { Hono } from "hono"
import type { Env } from "../types"
import { executeApp } from "../services/sandbox"

const live = new Hono<{ Bindings: Env }>()

function errorPage(title: string, message: string, status: number): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #888;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
    }
  </style>
</head>
<body><p>${message}</p></body>
</html>`
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html" },
  })
}

live.get("/live/:id", async (c) => {
  const appId = c.req.param("id")

  try {
    return await executeApp(c.env, appId, c.req.raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Live app error for", appId, ":", message)

    if (message === "App not found") {
      return errorPage("Not Found", "App not found.", 404)
    }

    return errorPage("Error", "This app encountered an error.", 500)
  }
})

export default live
