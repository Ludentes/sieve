// @vitest-environment node
import { execFileSync, spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, expect, it } from "vitest"

let child: ReturnType<typeof spawn> | undefined
afterEach(() => {
  child?.kill("SIGKILL")
  child = undefined
})

const firstWord = (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve) => stream.once("data", (d) => resolve(String(d).trim())))

it("a second OS process is refused the lease the first holds", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sieve-multi-"))
  const script = path.join(import.meta.dirname, "take-lease.ts")

  child = spawn(process.execPath, [script, dir, "--hold"], {
    stdio: ["ignore", "pipe", "inherit"],
  })
  expect(await firstWord(child.stdout as NodeJS.ReadableStream)).toBe("TOOK")

  const second = execFileSync(process.execPath, [script, dir], {
    encoding: "utf8",
  })
  expect(second.trim()).toBe("REFUSED")
}, 60_000)

it("the lease is reclaimed when the holder dies", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sieve-multi-"))
  const script = path.join(import.meta.dirname, "take-lease.ts")

  child = spawn(process.execPath, [script, dir, "--hold"], {
    stdio: ["ignore", "pipe", "inherit"],
  })
  expect(await firstWord(child.stdout as NodeJS.ReadableStream)).toBe("TOOK")

  // pid liveness, not a TTL: a dead holder's claim is free immediately.
  child.kill("SIGKILL")
  await new Promise((resolve) => child?.once("exit", resolve))

  const second = execFileSync(process.execPath, [script, dir], {
    encoding: "utf8",
  })
  expect(second.trim()).toBe("TOOK")
}, 60_000)
