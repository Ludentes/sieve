import { Client } from "eve/client"
import type { Event } from "./view"

export type Step = { session: string; message: string; after?: number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Contention here is STAGED, not raced: `after` is what makes session A still
 * hold when B arrives, so the transcript is deterministic by construction. A
 * raced version could not assert an order, because Marshal never queues and
 * permit.ts is first-come.
 */
/**
 * The refusal, in the words Marshal used, pulled out of a transcript that is
 * three kilobytes of events. Printing the raw transcript would hide the one
 * line the demonstration exists to show.
 */
function describeRefusal(transcript: string): string | undefined {
  const match = transcript.match(/\{\\"refused\\":(\{.*?\}\})/)
  if (match === null) return undefined
  const blocked = JSON.parse(match[1]!.replaceAll('\\"', '"')) as {
    kind: string
    resource?: string
    by?: { id: string; what: string }
    resets?: number
    until?: number
  }
  const who =
    blocked.by === undefined
      ? ""
      : ` by ${blocked.by.id} (${blocked.by.what})`
  return `${blocked.kind}: ${blocked.resource ?? "?"}${who}`
}

export async function runScenario(input: {
  host: string
  steps: Step[]
}): Promise<Event[]> {
  const client = new Client({ host: input.host })
  await client.health()

  const started = Date.now()
  const events: Event[] = []

  await Promise.all(
    input.steps.map(async (step) => {
      if (step.after !== undefined) await sleep(step.after)
      const { response } = await client.sessions.create({
        message: step.message,
      })
      const text = JSON.stringify(await response.result())
      const refusal = describeRefusal(text)
      events.push({
        at: Date.now() - started,
        session: step.session,
        kind: refusal === undefined ? "grant" : "refusal",
        detail: refusal ?? step.message,
      })
    }),
  )

  return events.sort((a, b) => a.at - b.at)
}
