import { clerkMiddleware, getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { Hono } from "hono"

export function applyAuth(app: Hono<{ Bindings: Env }>) {
  app.use("/dashboard/*", clerkMiddleware())
  app.use("/generate", clerkMiddleware())
  app.use("/app/*", clerkMiddleware())

  app.use("/dashboard/*", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.redirect("/")
    await next()
  })

  app.use("/generate", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401)
    await next()
  })

  app.use("/app/*", async (c, next) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.redirect("/")
    await next()
  })
}
