import type { AppRecord } from "../types"

interface CreateAppInput {
  id: string
  user_id: string
  prompt: string
  code: string
}

export async function createApp(db: D1Database, input: CreateAppInput): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare("INSERT INTO apps (id, user_id, prompt, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(input.id, input.user_id, input.prompt, input.code, now, now)
    .run()
}

export async function getAppById(db: D1Database, id: string): Promise<AppRecord | null> {
  return db.prepare("SELECT * FROM apps WHERE id = ?").bind(id).first<AppRecord>()
}

export async function getAppsByUser(db: D1Database, userId: string): Promise<AppRecord[]> {
  const { results } = await db
    .prepare("SELECT id, user_id, prompt, created_at, updated_at FROM apps WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<AppRecord>()
  return results
}

export async function deleteApp(db: D1Database, id: string, userId: string): Promise<void> {
  await db.prepare("DELETE FROM apps WHERE id = ? AND user_id = ?").bind(id, userId).run()
}

export async function countUserAppsToday(db: D1Database, userId: string): Promise<number> {
  const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM apps WHERE user_id = ? AND created_at >= ?")
    .bind(userId, startOfDay)
    .first<{ count: number }>()
  return result?.count ?? 0
}
