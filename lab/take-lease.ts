import { NoPermit } from "@ludentes/marshal/permit"
import { takeHostLease } from "../admission/host-lease.ts"

/**
 * Prints one word — TOOK or REFUSED — and exits.
 *
 * With `--hold` it stays alive after taking, so a parent can assert what a
 * SECOND process sees while this one is genuinely still running. Without the
 * flag it must exit, or a parent reading it with execFileSync waits forever
 * for a process whose whole job is not to finish.
 */
const [dir, mode] = process.argv.slice(2)
if (dir === undefined) throw new Error("usage: take-lease.ts <dir> [--hold]")

try {
  takeHostLease(dir)
  console.log("TOOK")
  if (mode === "--hold") setInterval(() => {}, 1000)
} catch (error) {
  if (error instanceof NoPermit) {
    console.log("REFUSED")
    process.exit(0)
  }
  throw error
}
