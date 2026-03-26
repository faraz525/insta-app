import { Hono } from "hono"
import type { Env } from "../types"

const signIn = new Hono<{ Bindings: Env }>()

signIn.get("/sign-in", (c) => {
  // Decode the publishable key to extract the Clerk instance domain
  // pk_test_BASE64ENCODED → decode → "diverse-slug-91.clerk.accounts.dev$"
  const pk = c.env.CLERK_PUBLISHABLE_KEY
  const encoded = pk.replace(/^pk_test_|^pk_live_/, "")
  let clerkDomain: string
  try {
    clerkDomain = atob(encoded).replace(/\$$/, "")
  } catch {
    clerkDomain = "diverse-slug-91.clerk.accounts.dev"
  }

  const redirectUrl = `https://${clerkDomain}/sign-in?redirect_url=${encodeURIComponent(c.req.url.replace("/sign-in", "/dashboard"))}`
  return c.redirect(redirectUrl)
})

export default signIn
