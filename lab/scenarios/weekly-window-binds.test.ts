// @vitest-environment node
import { expect, it } from "vitest"
import { pick } from "@ludentes/marshal/pick"
import { budgetWindows, cost } from "../../admission/resources"

it("the week binds while the 5-hour window is wide open", () => {
  const now = Date.now()
  const windows = budgetWindows(now)
  const week = windows.find((w) => w.name === "week")
  const short = windows.find((w) => w.name === "5h")

  expect(week?.spent).toBe(week?.limit)
  expect((short?.limit ?? 0) - (short?.spent ?? 0)).toBeGreaterThan(0)

  const result = pick({
    jobs: [{ id: "s-1", needs: ["provider"] }],
    capacity: { budget: { provider: windows } },
    rank: (jobs) => jobs.map((job) => ({ job, rank: 0, why: { base: 0 } })),
    now,
    cost,
  })

  expect(result.granted).toHaveLength(0)
  expect(result.refused[0]?.blocked.kind).toBe("budget-exhausted")
})
