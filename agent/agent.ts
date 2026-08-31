import { defineAgent } from "eve"
import { mockModel } from "eve/evals"
import { takeHostLease } from "../admission/host-lease"

// One host, one lease. A second process refuses here rather than corrupting
// the first one's work an hour from now.
takeHostLease()

/**
 * The default model is a scripted mock, so this repository runs with no API
 * key. Set MODEL_ID to use a real provider.
 *
 * The script is a deterministic tool loop: call the guarded tool first, then
 * report whatever came back. When admission refuses, that report is the point
 * of the whole reference.
 */
const scripted = mockModel({
  modelId: "sieve-script",
  provider: "sieve",
  respond: ({ toolResults }) =>
    toolResults.length === 0
      ? { toolCalls: [{ name: "edit_workspace", input: { change: "rename" } }] }
      : `Tool said: ${JSON.stringify(toolResults[0]?.output)}`,
})

export default defineAgent({
  model: process.env.MODEL_ID ?? scripted,
  /**
   * `eve build` compiles compaction ahead of time, and it sizes the trigger
   * from the primary model's context window — which it looks up in the AI
   * Gateway catalogue. A mock model is in no catalogue, so without this
   * override the build fails before it ever reaches a tool. Stating the
   * number is the documented escape hatch, and it keeps `pnpm build` working
   * for a fork that has no key.
   */
  modelContextWindowTokens: 128_000,
})
