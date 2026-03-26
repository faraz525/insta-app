import { WorkerEntrypoint } from "cloudflare:workers"
import type { Env } from "../types"

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google",
  "[::1]",
]

export class OutboundProxy extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const isBlocked = BLOCKED_HOSTS.some((host) => url.hostname.includes(host))

    if (isBlocked) {
      return new Response("Blocked: access to internal resources is not allowed", { status: 403 })
    }

    return fetch(request)
  }
}
