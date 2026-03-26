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
import { clerkMiddleware, getAuth } from "@hono/clerk-auth"

const app = new Hono<{ Bindings: Env }>()

applyAuth(app)

app.route("/", landing)
app.route("/", signIn)
app.route("/", dashboard)
app.route("/", dashboardJs)
app.route("/", generate)
app.route("/", appView)
app.route("/", live)

// Delete via POST to avoid Clerk middleware issues with DELETE method
app.post("/delete-app/:id", clerkMiddleware(), async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401)
  await deleteApp(c.env.DB, c.req.param("id"), auth.userId)
  return c.json({ success: true })
})

export default app
export { OutboundProxy }
