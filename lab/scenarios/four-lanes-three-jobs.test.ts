// @vitest-environment node
import { expect, it } from "vitest"
import { pick } from "@ludentes/marshal/pick"
import type { Holder } from "@ludentes/marshal/types"

const holder = (id: string): Holder => ({ id, what: "running", since: "t0" })

it("refuses the fourth job when three lanes of three are taken", () => {
  const result = pick({
    jobs: [{ id: "s-4", needs: ["lane"] }],
    capacity: {
      counting: {
        lane: {
          limit: 3,
          holders: [holder("s-1"), holder("s-2"), holder("s-3")],
        },
      },
    },
    rank: (jobs) => jobs.map((job) => ({ job, rank: 0, why: { base: 0 } })),
    now: Date.now(),
  })

  const blocked = result.refused[0]?.blocked
  expect(blocked?.kind).toBe("no-capacity")
  if (blocked?.kind === "no-capacity") {
    expect(blocked.holders.map((h) => h.id)).toEqual(["s-1", "s-2", "s-3"])
  }
})
