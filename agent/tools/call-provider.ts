import { defineTool } from "eve/tools"
import { z } from "zod"
import { guard } from "../../admission/guard.ts"

/** One resource, for the reason given in edit-workspace.ts. */
export const needs = ["provider"] as const

export default defineTool({
  description: "Call the shared model provider.",
  inputSchema: z.object({ prompt: z.string().min(1) }),
  async execute({ prompt }, ctx) {
    const result = await guard(
      { sessionId: ctx.session.id, what: `calling out: ${prompt}`, needs },
      async () => ({ answered: prompt }),
    )
    return result.ok ? result.value : { refused: result.blocked }
  },
})
