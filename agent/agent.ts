import { defineAgent } from "eve"
import { mockModel } from "eve/evals"

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
})
