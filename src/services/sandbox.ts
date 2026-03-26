import type { Env } from "../types"
import { getAppById } from "../db/apps"

export async function executeApp(env: Env, appId: string, request: Request): Promise<Response> {
  const app = await getAppById(env.DB, appId)

  if (!app) {
    throw new Error("App not found")
  }

  try {
    // LOADER is a Dynamic Workers binding (WorkerLoader type)
    const loader = env.LOADER as any
    const worker = loader.get(appId, async () => ({
      compatibilityDate: "2026-03-01",
      mainModule: "app.js",
      modules: { "app.js": app.code },
    }))

    // Pass a clean request to the Dynamic Worker (not the /live/:id URL)
    const appRequest = new Request("https://app.local/", {
      method: request.method,
      headers: request.headers,
    })

    return await worker.getEntrypoint().fetch(appRequest)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Dynamic Worker execution failed for app", appId, ":", msg)
    console.error("Code (first 200 chars):", app.code.slice(0, 200))
    throw err
  }
}
