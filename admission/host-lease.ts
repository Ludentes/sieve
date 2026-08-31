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
 *
 * CALL IT FROM YOUR PROCESS ENTRY POINT, NOT FROM THE AGENT MODULE. Measured
 * against eve 0.47.3: `eve start` runs two live processes — the CLI supervisor
 * and the built server it spawns — and both evaluate the agent module. The
 * second call then finds a live holder and throws NoPermit at the first
 * request, which is one process refusing itself. permit.ts has no same-pid
 * exemption, and it should not: two evaluations in one process are two claims
 * on a resource that admits one, and the lease cannot tell which of them is
 * the host.
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
