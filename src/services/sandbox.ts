import type { Env } from "../types"
import { getAppById } from "../db/apps"

export async function executeApp(env: Env, appId: string, request: Request): Promise<Response> {
  try {
    // D1 lookup is inside the callback — only runs when isolate isn't warm
    const loader = env.LOADER as any
    const worker = loader.get(appId, async () => {
      const app = await getAppById(env.DB, appId)
      if (!app) throw new Error("App not found")
      return {
        compatibilityDate: "2026-03-01",
        mainModule: "app.js",
        modules: { "app.js": app.code },
      }
    })

    const appRequest = new Request("https://app.local/", {
      method: request.method,
      headers: request.headers,
    })

    return await worker.getEntrypoint().fetch(appRequest)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Dynamic Worker error for", appId, ":", msg)
    throw err
  }
}
