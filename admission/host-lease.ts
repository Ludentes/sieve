import { tmpdir } from "node:os"
import { acquirePermit, type Permit } from "@ludentes/marshal/permit"

/**
 * The OTHER layer, and the one people conflate with pick().
 *
 * pick() decides which SESSION may start, from an in-memory ledger inside one
 * host. This decides whether this HOST may run at all, against other OS
 * processes, over lease files and pid liveness — never a TTL, because a job
 * legitimately runs longer than any timeout we would dare set.
 *
 * This is mechanism, so it lives in the kept half. lab/ only demonstrates it.
 */
export function takeHostLease(dir: string = tmpdir()): Permit {
  return acquirePermit({
    dir,
    key: "sieve-host",
    permits: 1,
    holder: {
      pid: process.pid,
      what: "sieve host",
      since: new Date().toISOString(),
      // PermitHolder requires the resource it covers, echoed into the file so
      // an operator reading it by hand knows what is held.
      scope: "sieve-host",
    },
  })
}
