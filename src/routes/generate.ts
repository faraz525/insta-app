import { Hono } from "hono"
import { getAuth } from "@hono/clerk-auth"
import type { Env, GenerateRequest, GenerateResponse } from "../types"
import { generateAppCode } from "../services/generator"
import { createApp, countUserAppsToday } from "../db/apps"
import { generateId } from "../lib/id"

const MAX_PROMPT_LENGTH = 500
const MAX_APPS_PER_DAY = 20

const generate = new Hono<{ Bindings: Env }>()

generate.post("/generate", async (c) => {
  const auth = getAuth(c)
  const userId = auth?.userId

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  let body: GenerateRequest
  try {
    body = await c.req.json<GenerateRequest>()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return c.json({ error: "Prompt is required" }, 400)
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return c.json({ error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }, 400)
  }

  const todayCount = await countUserAppsToday(c.env.DB, userId)
  if (todayCount >= MAX_APPS_PER_DAY) {
    return c.json({ error: "Rate limit reached: max 20 apps per day" }, 429)
  }

  const result = await generateAppCode(c.env.AI, prompt)

  if (!result.success) {
    return c.json({ error: "Generation failed — try rephrasing your prompt" }, 422)
  }

  const id = generateId()

  await createApp(c.env.DB, {
    id,
    user_id: userId,
    prompt,
    code: result.code,
  })

  const response: GenerateResponse = {
    id,
    live_url: `/live/${id}`,
    embed_url: `/app/${id}`,
  }

  return c.json(response, 201)
})

export default generate
