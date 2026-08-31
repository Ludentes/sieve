import { defineAgent } from "eve"
import { mockModel } from "eve/evals"

/**
 * The default model is a scripted mock, so this repository runs with no API
 * key. Set MODEL_ID to use a real provider.
 *
 * The script is a deterministic tool loop: call the guarded tool first, then
 * report whatever came back. When admission refuses, that report is the point
 * of the whole reference.
 *
 * The tool's name is its FILENAME — `edit-workspace`, not `edit_workspace`.
 * Getting it wrong does not fail: eve hands the model a NoSuchToolError, the
 * script dutifully reports it, and every session looks admitted because the
 * guard was never reached.
 */
const scripted = mockModel({
  modelId: "sieve-script",
  provider: "sieve",
  respond: ({ toolResults }) =>
    toolResults.length === 0
      ? { toolCalls: [{ name: "edit-workspace", input: { change: "rename" } }] }
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
