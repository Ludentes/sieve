import type { BudgetWindow } from "@ludentes/marshal/pick"
import type { CostFn } from "@ludentes/marshal/types"

/**
 * This app's vocabulary, in one file. A fork's first edit belongs here — change
 * these names and nothing else has to move.
 */
export const EXCLUSIVE = ["workspace:alpha"] as const
export const BUDGET = "provider"

/**
 * Seeded near the limit ON PURPOSE. pick() prices an unpriced job at zero, and
 * an unspent window refuses nothing, so a budget scenario with honest numbers
 * would demonstrate nothing at all.
 *
 * The two windows are the finding this package carries: the weekly allowance
 * bound roughly 6.7x harder than the 5-hour one, so admission must satisfy
 * EVERY window rather than the loosest.
 */
export function budgetWindows(now: number): BudgetWindow[] {
  return [
    { name: "week", limit: 13, spent: 13, resets: now + 604_800_000 },
    { name: "5h", limit: 87, spent: 3, resets: now + 18_000_000 },
  ]
}

/** A breaker: a resource that exists but may not be taken yet. */
export const unavailableUntil: number | undefined = undefined

/** Without a cost, no budget window ever binds. */
export const cost: CostFn = () => 1
