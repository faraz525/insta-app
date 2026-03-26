import { Hono } from "hono"
import type { Env } from "./types"
import { applyAuth } from "./middleware/auth"
import landing from "./routes/landing"
import signIn from "./routes/sign-in"
import dashboard from "./routes/dashboard"
import dashboardJs from "./routes/dashboard-js"
import generate from "./routes/generate"
import appView from "./routes/app-view"
import appDelete from "./routes/app-delete"
import live from "./routes/live"
import { OutboundProxy } from "./services/outbound-proxy"

const app = new Hono<{ Bindings: Env }>()

applyAuth(app)

app.route("/", landing)
app.route("/", signIn)
app.route("/", dashboard)
app.route("/", dashboardJs)
app.route("/", generate)
app.route("/", appView)
app.route("/", appDelete)
app.route("/", live)

export default app
export { OutboundProxy }
