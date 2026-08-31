// @vitest-environment node
import { expect, it } from "vitest"
import { pick } from "@ludentes/marshal/pick"

it("a breaker makes a resource unavailable, not held", () => {
  const now = Date.now()
  const result = pick({
    jobs: [{ id: "s-1", needs: ["provider"] }],
    capacity: { unavailable: { provider: { until: now + 30_000 } } },
    rank: (jobs) => jobs.map((job) => ({ job, rank: 0, why: { base: 0 } })),
    now,
  })

  const blocked = result.refused[0]?.blocked
  expect(blocked?.kind).toBe("not-ready")
  if (blocked?.kind === "not-ready") expect(blocked.until).toBe(now + 30_000)
})
