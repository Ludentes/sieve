// @vitest-environment node
import { expect, it } from "vitest"
import { guard, ledger } from "./guard.ts"

it("admits when nothing holds the resource", async () => {
  const r = await guard(
    { sessionId: "s-1", what: "editing", needs: ["workspace:alpha"] },
    async () => "done",
  )
  expect(r).toEqual({ ok: true, value: "done" })
})

it("releases the hold after the body finishes", async () => {
  await guard(
    { sessionId: "s-1", what: "editing", needs: ["workspace:alpha"] },
    async () => "done",
  )
  expect(ledger.holderOf("workspace:alpha")).toBeUndefined()
})

it("releases the hold even when the body throws", async () => {
  await expect(
    guard(
      { sessionId: "s-1", what: "editing", needs: ["workspace:alpha"] },
      async () => {
        throw new Error("boom")
      },
    ),
  ).rejects.toThrow("boom")
  expect(ledger.holderOf("workspace:alpha")).toBeUndefined()
})

it("refuses a second session by name while the first holds", async () => {
  let inner: Awaited<ReturnType<typeof guard>> | undefined
  await guard(
    { sessionId: "s-1", what: "renaming files", needs: ["workspace:alpha"] },
    async () => {
      inner = await guard(
        { sessionId: "s-2", what: "editing", needs: ["workspace:alpha"] },
        async () => "should not run",
      )
      return "outer"
    },
  )
  expect(inner?.ok).toBe(false)
  if (inner?.ok === false) {
    expect(inner.blocked.kind).toBe("resource-held")
    if (inner.blocked.kind === "resource-held") {
      expect(inner.blocked.by.id).toBe("s-1")
      expect(inner.blocked.by.what).toBe("renaming files")
    }
  }
})

it("refuses on an exhausted budget window", async () => {
  const r = await guard(
    { sessionId: "s-3", what: "calling out", needs: ["provider"] },
    async () => "sent",
  )
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.blocked.kind).toBe("budget-exhausted")
})

it("does not refuse the current holder its own resource", async () => {
  let inner: Awaited<ReturnType<typeof guard>> | undefined
  await guard(
    { sessionId: "s-1", what: "editing", needs: ["workspace:alpha"] },
    async () => {
      inner = await guard(
        { sessionId: "s-1", what: "editing again", needs: ["workspace:alpha"] },
        async () => "replayed",
      )
      return "outer"
    },
  )
  expect(inner).toEqual({ ok: true, value: "replayed" })
})
