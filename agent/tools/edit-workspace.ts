import { defineTool } from "eve/tools"
import { z } from "zod"
import { guard } from "../../admission/guard.ts"

/**
 * A tool declares its OWN needs. Sourcing them from a scenario would make the
 * kept half depend on the half that gets deleted.
 *
 * Exactly one resource, always: Grant.holds is a string[] but acquirePermit()
 * takes one key, so two resources would mean two acquires and a partial take.
 */
export const needs = ["workspace:alpha"] as const

export default defineTool({
  description: "Edit the shared alpha workspace.",
  inputSchema: z.object({ change: z.string().min(1) }),
  async execute({ change }, ctx) {
    const result = await guard(
      { sessionId: ctx.session.id, what: `editing: ${change}`, needs },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        return { applied: change }
      },
    )
    return result.ok ? result.value : { refused: result.blocked }
  },
})
