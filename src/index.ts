import { Hono } from "hono"
import type { Env } from "./types"
import { applyAuth } from "./middleware/auth"
import landing from "./routes/landing"
import signIn from "./routes/sign-in"
import dashboard from "./routes/dashboard"
import dashboardJs from "./routes/dashboard-js"
import generate from "./routes/generate"
import appView from "./routes/app-view"
import live from "./routes/live"
import { OutboundProxy } from "./services/outbound-proxy"
import { deleteApp } from "./db/apps"

const app = new Hono<{ Bindings: Env }>()

applyAuth(app)

app.route("/", landing)
app.route("/", signIn)
app.route("/", dashboard)
app.route("/", dashboardJs)
app.route("/", generate)
app.route("/", appView)
app.route("/", live)

// Delete handler: uses Clerk backend SDK directly to avoid middleware handshake redirect
app.delete("/app/:id", async (c) => {
  const { createClerkClient } = await import("@clerk/backend")
  const clerk = createClerkClient({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  })
  const requestState = await clerk.authenticateRequest(c.req.raw, {
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  })
  const auth = requestState.toAuth()
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401)
  await deleteApp(c.env.DB, c.req.param("id"), auth.userId)
  return c.json({ success: true })
})

export default app
export { OutboundProxy }
