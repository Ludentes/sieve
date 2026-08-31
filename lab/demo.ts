import { spawn } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import { takeHostLease } from "../admission/host-lease.ts"
import { runScenario } from "./runner.ts"
import { render } from "./view.ts"

/**
 * The two-minute demonstration: build, boot, stage two sessions against one
 * workspace, print what admission decided.
 *
 * `eve dev --no-ui` rather than `eve start`: a built server requires Vercel
 * OIDC on the session route and answers 401, which is correct for a deployment
 * and useless for a demonstration that must run with no credential.
 *
 * It starts the host itself rather than asking the reader to run two terminals,
 * and it needs no credential — the agent's default model is a scripted mock.
 *
 * The host lease is taken HERE, in the one process that is the host, rather
 * than in the agent module — see admission/host-lease.ts for what eve start
 * does that makes the agent module the wrong place.
 */
// Not 3000: eve's own default collides with half the dev tools people run.
const PORT = Number(process.env.PORT ?? 3100)
const host = `http://127.0.0.1:${PORT}`

// One host, one lease. A second demo refuses here rather than fighting the
// first one for the workspace an hour from now.
takeHostLease()

// `detached` so the whole group can be signalled: npx is a wrapper, and
// killing it leaves the server it spawned listening — measured, and the next
// run then talks to a stale host instead of the one it just started.
const server = spawn("npx", ["eve", "dev", "--no-ui", "--port", String(PORT)], {
  stdio: ["ignore", "inherit", "inherit"],
  detached: true,
})

async function waitForHealth(): Promise<void> {
  // The host takes its lease at boot, so a failure to come up is as likely to
  // be a second sieve already running as it is a slow start. Say so.
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${host}/eve/v1/health`)
      if (response.ok) return
    } catch (error) {
      if (attempt === 59) console.error("health probe failed:", error)
    }
    await delay(500)
  }
  throw new Error(`${host} never became healthy — is another sieve running?`)
}

try {
  await waitForHealth()
  const events = await runScenario({
    host,
    steps: [
      { session: "s-a", message: "rename the config" },
      { session: "s-b", message: "rename it back", after: 60 },
    ],
  })
  console.log(render(events))
} finally {
  if (server.pid !== undefined) {
    try {
      process.kill(-server.pid, "SIGTERM")
    } catch (error) {
      console.error("could not stop the host:", error)
    }
  }
}
