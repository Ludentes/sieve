// @vitest-environment node
import { expect, it } from "vitest"
import { guard } from "../../admission/guard"

it("the second session is refused by name, then admitted after release", async () => {
  const transcript: string[] = []

  await guard(
    { sessionId: "s-a", what: "renaming files", needs: ["workspace:alpha"] },
    async () => {
      transcript.push("grant s-a")
      const second = await guard(
        { sessionId: "s-b", what: "editing", needs: ["workspace:alpha"] },
        async () => "never",
      )
      if (!second.ok && second.blocked.kind === "resource-held") {
        transcript.push(`refuse s-b: held by ${second.blocked.by.id}`)
      }
      return "done"
    },
  )
  transcript.push("release s-a")

  const third = await guard(
    { sessionId: "s-b", what: "editing", needs: ["workspace:alpha"] },
    async () => "edited",
  )
  if (third.ok) transcript.push("grant s-b")

  expect(transcript).toEqual([
    "grant s-a",
    "refuse s-b: held by s-a",
    "release s-a",
    "grant s-b",
  ])
})
