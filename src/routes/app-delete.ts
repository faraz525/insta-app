import { Hono } from "hono"
import { getAuth } from "@hono/clerk-auth"
import type { Env } from "../types"
import { deleteApp } from "../db/apps"

const appDelete = new Hono<{ Bindings: Env }>()

appDelete.delete("/app/:id", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const appId = c.req.param("id")
  await deleteApp(c.env.DB, appId, userId)

  return c.json({ success: true })
})

export default appDelete
