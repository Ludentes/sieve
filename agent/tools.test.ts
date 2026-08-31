// @vitest-environment node
import { expect, it } from "vitest"
import callProvider, { needs as providerNeeds } from "./tools/call-provider"
import { needs as workspaceNeeds } from "./tools/edit-workspace"

const ctx = { session: { id: "s-1" } } as never

it("each guarded tool declares exactly one resource", () => {
  expect(workspaceNeeds).toHaveLength(1)
  expect(providerNeeds).toHaveLength(1)
})

it("a refused tool returns the refusal instead of throwing", async () => {
  const result = await callProvider.execute({ prompt: "hi" }, ctx)
  expect(result).toHaveProperty("refused")
})
