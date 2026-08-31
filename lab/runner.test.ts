// @vitest-environment node
import { expect, it } from "vitest"
import { render, type Event } from "./view.ts"

it("draws a timeline naming the holder on a refusal", () => {
  const events: Event[] = [
    { at: 0, session: "s-a", kind: "grant", detail: "workspace:alpha" },
    { at: 12, session: "s-b", kind: "refusal", detail: "resource-held by s-a" },
  ]
  const out = render(events)
  expect(out).toContain("s-a")
  expect(out).toContain("resource-held by s-a")
})
