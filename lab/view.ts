export type Event = {
  at: number
  session: string
  kind: "grant" | "refusal"
  detail: string
}

const MARK = { grant: "OK ", refusal: "NO " } as const

/** A timeline is the whole UI. A dashboard is a different project. */
export function render(events: Event[]): string {
  return events
    .map(
      (e) =>
        `${String(e.at).padStart(6)}ms  ${MARK[e.kind]} ${e.session}  ${e.detail}`,
    )
    .join("\n")
}
