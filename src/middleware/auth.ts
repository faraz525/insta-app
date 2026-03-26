import { clerkMiddleware, getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { Hono } from "hono"

export function applyAuth(app: Hono<{ Bindings: Env }>) {
  // Apply Clerk middleware to auth-required routes
  app.use("/dashboard", clerkMiddleware())
  app.use("/dashboard/*", clerkMiddleware())
  app.use("/generate", clerkMiddleware())
  // Apply Clerk middleware to /app/* only for GET requests
  // DELETE has its own inline auth check to avoid Clerk handshake redirects
  app.use("/app/*", async (c, next) => {
    if (c.req.method === "DELETE") return next()
    return clerkMiddleware()(c, next)
  })

  // Auth guard for dashboard (exact + wildcard)
  const dashboardGuard = async (c: any, next: any) => {
    const auth = getAuth(c)
    if (!auth?.userId) {
      return c.redirect("/sign-in")
    }
    await next()
  }

  app.use("/dashboard", dashboardGuard)
  app.use("/dashboard/*", dashboardGuard)

  app.use("/generate", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401)
    await next()
  })

  app.use("/app/*", async (c, next) => {
    if (c.req.method === "DELETE") return next()
    const auth = getAuth(c)
    if (!auth?.userId) return c.redirect("/sign-in")
    await next()
  })
}
