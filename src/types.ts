import type { Context } from "hono"

// WorkerLoader is a Dynamic Workers API type that may not yet exist
// in @cloudflare/workers-types — using `any` as a temporary workaround
export interface Env {
  AI: Ai
  DB: D1Database
  LOADER: any
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

export interface AppRecord {
  id: string
  user_id: string
  prompt: string
  code: string
  created_at: number
  updated_at: number
}

export interface GenerateRequest {
  prompt: string
}

export interface GenerateResponse {
  id: string
  live_url: string
  embed_url: string
}

export type AppContext = Context<{ Bindings: Env }>
