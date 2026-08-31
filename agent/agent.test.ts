// @vitest-environment node
import { expect, it } from "vitest"
import agent from "./agent"

it("defaults to a model that needs no credential", () => {
  expect(agent.model).toBeDefined()
  expect(typeof agent.model).not.toBe("string")
})
