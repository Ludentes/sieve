// @vitest-environment node
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { beforeEach, expect, it } from "vitest"
import { NoPermit } from "@ludentes/marshal/permit"
import { takeHostLease } from "./host-lease.ts"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sieve-lease-"))
})

it("the first caller takes the lease", () => {
  expect(takeHostLease(dir).slot).toBe(0)
})

it("a second live caller is refused", () => {
  takeHostLease(dir)
  expect(() => takeHostLease(dir)).toThrow(NoPermit)
})
