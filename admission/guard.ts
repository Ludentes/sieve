import { pick } from "@ludentes/marshal/pick"
import type { Blocked, Holder, Job, RankFn } from "@ludentes/marshal/types"
import { Ledger } from "./ledger.ts"
import {
  BUDGET,
  budgetWindows,
  cost,
  EXCLUSIVE,
  unavailableUntil,
} from "./resources.ts"

/**
 * Eve on one side, Marshal on the other. The only file that knows both, and the
 * only file worth copying if you take nothing else from this repository.
 */

/** The shared state for this host. One agent, one ledger. */
export const ledger = new Ledger()

/**
 * pick() requires a rank, and it must return a total permutation of the jobs it
 * is given, each with a `why`, or pick() throws. The guard admits one job at a
 * time, so this is the whole of it. A consumer admitting batches would put its
 * aging curve here.
 */
const rank: RankFn = (jobs) =>
  jobs.map((job) => ({ job, rank: 0, why: { base: 0 } }))

export type Guarded<T> =
  | { ok: true; value: T }
  | { ok: false; blocked: Blocked }

const isExclusive = (name: string): boolean =>
  (EXCLUSIVE as readonly string[]).includes(name)

export async function guard<T>(
  input: { sessionId: string; what: string; needs: readonly string[] },
  body: () => Promise<T>,
): Promise<Guarded<T>> {
  const holder: Holder = {
    id: input.sessionId,
    what: input.what,
    since: new Date().toISOString(),
  }
  /**
   * A replay by the CURRENT holder skips pick(), so a session is never refused
   * a resource it already owns. It applies ONLY when every name it needs is an
   * exclusive resource it holds: `every` over a list with no exclusive name is
   * vacuously true, and that skipped admission altogether for a budget-only
   * call — the exhausted window was never consulted.
   */
  const exclusiveNeeds = input.needs.filter(isExclusive)
  const mine =
    exclusiveNeeds.length === input.needs.length &&
    exclusiveNeeds.length > 0 &&
    exclusiveNeeds.every((name) => ledger.holderOf(name)?.id === holder.id)
  const taken: string[] = []

  if (!mine) {
    const job: Job = { id: input.sessionId, needs: [...input.needs] }
    const now = Date.now()
    const result = pick({
      jobs: [job],
      capacity: {
        exclusive: ledger.exclusive(EXCLUSIVE),
        budget: { [BUDGET]: budgetWindows(now) },
        ...(unavailableUntil === undefined
          ? {}
          : { unavailable: { [BUDGET]: { until: unavailableUntil } } }),
      },
      rank,
      now,
      cost,
    })
    const refusal = result.refused[0]
    // Marshal NEVER QUEUES. The refusal goes back to the model, which decides
    // whether to try again — that decision is the behaviour worth showing.
    if (refusal !== undefined) return { ok: false, blocked: refusal.blocked }
    for (const name of input.needs) {
      if (isExclusive(name)) {
        ledger.hold(name, holder)
        taken.push(name)
      }
    }
  }

  try {
    return { ok: true, value: await body() }
  } finally {
    for (const name of taken) ledger.release(name, holder.id)
  }
}
