import type { Env } from "../types"
import { getAppById } from "../db/apps"

export async function executeApp(env: Env, appId: string, request: Request): Promise<Response> {
  const app = await getAppById(env.DB, appId)

  if (!app) {
    throw new Error("App not found")
  }

  // LOADER is a Dynamic Workers binding (WorkerLoader type)
  // Using `any` since the type may not be in @cloudflare/workers-types yet
  const worker = env.LOADER.get(appId, async () => ({
    compatibilityDate: "2026-03-01",
    mainModule: "app.js",
    modules: { "app.js": app.code },
  }))

  return worker.getEntrypoint().fetch(request)
}
