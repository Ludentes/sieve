// @vitest-environment node
import { beforeEach, expect, it } from "vitest"
import type { Holder } from "@ludentes/marshal/types"
import { Ledger } from "./ledger.ts"

const a: Holder = { id: "s-a", what: "editing", since: "t0" }
const b: Holder = { id: "s-b", what: "editing", since: "t1" }
let ledger: Ledger

beforeEach(() => {
  ledger = new Ledger()
})

it("reports a holder after a hold", () => {
  ledger.hold("ws", a)
  expect(ledger.holderOf("ws")?.id).toBe("s-a")
})

it("shapes capacity for pick(), naming the holder", () => {
  ledger.hold("ws", a)
  expect(ledger.exclusive(["ws", "other"])).toEqual({
    ws: { by: a },
    other: {},
  })
})

it("a re-acquire by the current holder is a no-op, not a throw", () => {
  ledger.hold("ws", a)
  expect(() => ledger.hold("ws", { ...a, since: "t9" })).not.toThrow()
  expect(ledger.holderOf("ws")?.since).toBe("t0")
})

it("refuses to overwrite another session's hold", () => {
  ledger.hold("ws", a)
  expect(() => ledger.hold("ws", b)).toThrow(/held by s-a/)
})

it("release by a non-holder does nothing", () => {
  ledger.hold("ws", a)
  ledger.release("ws", "s-b")
  expect(ledger.holderOf("ws")?.id).toBe("s-a")
})

it("release by the holder frees the resource", () => {
  ledger.hold("ws", a)
  ledger.release("ws", "s-a")
  expect(ledger.holderOf("ws")).toBeUndefined()
})
