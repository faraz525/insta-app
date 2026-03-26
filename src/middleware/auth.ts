import { clerkMiddleware, getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { Hono } from "hono"

export function applyAuth(app: Hono<{ Bindings: Env }>) {
  app.use("/dashboard", clerkMiddleware())
  app.use("/dashboard/*", clerkMiddleware())
  app.use("/generate", clerkMiddleware())

  // Skip Clerk middleware on DELETE — its handshake redirect breaks non-GET fetch requests
  app.use("/app/*", async (c, next) => {
    if (c.req.method === "DELETE") return next()
    return clerkMiddleware()(c, next)
  })

  // Redirect guards for page routes
  const redirectGuard = async (c: any, next: any) => {
    if (!getAuth(c)?.userId) return c.redirect("/sign-in")
    await next()
  }

  app.use("/dashboard", redirectGuard)
  app.use("/dashboard/*", redirectGuard)

  // JSON guard for API routes
  app.use("/generate", async (c, next) => {
    if (!getAuth(c)?.userId) return c.json({ error: "Unauthorized" }, 401)
    await next()
  })

  app.use("/app/*", async (c, next) => {
    if (c.req.method === "DELETE") return next()
    if (!getAuth(c)?.userId) return c.redirect("/sign-in")
    await next()
  })
}
