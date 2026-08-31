import type { Holder } from "@ludentes/marshal/types"

/**
 * Who holds what, in memory. This is the ONLY source of pick()'s capacity.
 *
 * pick() is pure and takes capacity as an argument, so something has to know
 * the current state; in Galatea that is the dispatcher's own bookkeeping, and
 * here it is this class. It is deliberately not derived from permit files:
 * Marshal exports no reader for those, and the two layers answer different
 * questions.
 *
 * In memory, and dying with the host, is correct — a host that is gone holds
 * nothing.
 */
export class Ledger {
  private readonly held = new Map<string, Holder>()

  holderOf(resource: string): Holder | undefined {
    return this.held.get(resource)
  }

  /**
   * A re-acquire by the CURRENT holder is a no-op rather than a refusal.
   * eve replays interrupted steps, so a guarded call can execute twice for one
   * session; without this the session refuses itself a resource it owns.
   */
  hold(resource: string, holder: Holder): void {
    const current = this.held.get(resource)
    if (current === undefined) {
      this.held.set(resource, holder)
      return
    }
    if (current.id !== holder.id) {
      throw new Error(`${resource} is held by ${current.id}, not ${holder.id}`)
    }
  }

  release(resource: string, holderId: string): void {
    if (this.held.get(resource)?.id === holderId) this.held.delete(resource)
  }

  exclusive(names: readonly string[]): Record<string, { by?: Holder }> {
    const out: Record<string, { by?: Holder }> = {}
    for (const name of names) {
      const by = this.held.get(name)
      out[name] = by === undefined ? {} : { by }
    }
    return out
  }
}
