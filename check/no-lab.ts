/**
 * Lives at the repository root, in neither half. It cannot live in lab/ (it
 * would delete itself) and it should not live in agent/ or admission/, which
 * are what a fork keeps and should not carry test scaffolding.
 */
import { guard } from "../admission/guard.ts"

const first = await guard(
  { sessionId: "s-a", what: "holding", needs: ["workspace:alpha"] },
  async () => {
    const second = await guard(
      { sessionId: "s-b", what: "editing", needs: ["workspace:alpha"] },
      async () => "never",
    )
    if (second.ok) throw new Error("expected a refusal, got a grant")
    if (second.blocked.kind !== "resource-held") {
      throw new Error(`expected resource-held, got ${second.blocked.kind}`)
    }
    console.log(`refused, held by ${second.blocked.by.id}`)
    return "ok"
  },
)

if (!first.ok) throw new Error("the first session should have been admitted")
