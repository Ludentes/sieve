# sieve

Admission control for [Eve](https://www.npmjs.com/package/eve) agents, built on
[Marshal](https://github.com/Ludentes/marshal).

Two agent sessions want the same workspace. One gets it. The other is told who
has it and why — and told in words the model can read, so it can decide what to
do instead.

## Run it

No API key. No database. No Docker.

```bash
git clone https://github.com/Ludentes/sieve.git
cd sieve
pnpm install
pnpm vitest run lab/scenarios
```

Measured on 2026-08-31: **10 seconds** from `git clone` to four asserted
refusals, on a machine with an empty pnpm store.

For the same thing through a real agent over HTTP:

```bash
pnpm demo
```

which boots the agent, sends two overlapping messages, and prints:

```
   332ms  NO  s-b  resource-held: workspace:alpha by wrun_01M1B41D8… (editing: rename)
   580ms  OK  s-a  rename the config
```

The refusal arrives 332 ms in, while the first session is still working. It is
a tool *result*, not an error: the model is told the workspace is held, by
whom, and what they are doing with it.

## What Eve says about this

Eve is explicit that concurrent work needs non-overlapping scopes, and equally
explicit that it does not arrange them for you.

> Give parallel children non-overlapping write scopes.
> — `docs/subagents/index.mdx`

> Separate sessions still run independently.
> — `docs/concepts/execution-model-and-durability.mdx`

> Use `limits` for framework-owned runtime caps. Session token limits stop the
> current durable session from starting another model call…
> — `docs/agent-config.md`

Those are the three shapes of the gap. Write scopes must not overlap, but
nothing decides who gets one. Sessions run independently, which is the point,
and also means neither knows the other exists. `limits` caps a session against
itself; a shared provider budget is spent by all of them together.

This repository fills that gap at the tool boundary, which is the one place
where an agent's intent has already become a concrete request for a concrete
resource.

## The two layers

They are different questions, and merging them is the mistake worth naming
first.

**`pick()` — which session may start.** Pure: no clock, no filesystem. Capacity
is an argument, supplied here by `admission/ledger.ts`, an in-memory map of who
holds what inside this host. It never queues. A refusal names a holder and
returns immediately, because waiting is a decision the caller makes with its
own information.

**`acquirePermit()` — whether this host may run at all.** Lease files and pid
liveness across OS processes, never a TTL: a job legitimately runs longer than
any timeout you would dare set, and a TTL either kills live work or leaves a
crash holding a resource forever. It has no refusal kinds; it throws `NoPermit`.

`admission/guard.ts` is the only file that knows both Eve and Marshal, and the
only file worth copying if you take nothing else from here.

Take the host lease from your process entry point, **not** from the agent
module. `eve start` runs two live processes — the CLI supervisor and the built
server it spawns — and both evaluate the agent module, so a lease taken there
makes the host refuse itself.

## What is in here

The files worth reading, in the order they matter.

| File | What it does |
|---|---|
| `admission/guard.ts` | **Start here.** The only file that knows both Eve and Marshal. Builds capacity from the ledger, calls `pick()`, returns the refusal instead of throwing. |
| `admission/resources.ts` | This app's vocabulary: resource names, budget windows, the cost function. A fork's first edit belongs here. |
| `admission/ledger.ts` | Who holds what, in memory. The only source of `pick()`'s capacity. |
| `admission/host-lease.ts` | The other layer: one host at a time, over `acquirePermit()`. |
| `agent/tools/edit-workspace.ts` | A guarded tool declaring one exclusive resource. |
| `agent/tools/call-provider.ts` | A guarded tool declaring one budgeted resource. |
| `agent/agent.ts` | The Eve agent. Its default model is a scripted mock, which is why this runs with no key. |
| `check/no-lab.ts` | Proves the kept half still refuses after `lab/` is deleted. |
| `lab/scenarios/*.ts` | Four scenarios, one per non-`custom` refusal kind. |
| `lab/runner.ts`, `lab/view.ts`, `lab/demo.ts` | Stages contention over HTTP and prints the timeline. |
| `lab/second-host-refused.test.ts` | Two real OS processes, one lease. |

## Adapting it to your app

Three edits, in this order.

**Name your resources.** Everything else reads these.

```ts
// admission/resources.ts
export const EXCLUSIVE = ["repo:cms", "repo:web"] as const
export const BUDGET = "openai"
```

**Wrap the tool that touches them.** A tool declares its own needs — sourcing
them from a scenario would make the kept half depend on the half you delete.

```ts
async execute({ change }, ctx) {
  const result = await guard(
    { sessionId: ctx.session.id, what: `editing: ${change}`, needs },
    async () => doTheActualWork(change),
  )
  return result.ok ? result.value : { refused: result.blocked }
}
```

Return the refusal; do not throw it. Eve turns a thrown error into a tool
error, which tells the model it broke something. A refusal is not a failure —
it is information the model can act on, and putting it in front of the model is
the entire reason for guarding at the tool boundary.

**Take the host lease from your entry point**, not from the agent module. See
[The two layers](#the-two-layers) for what `eve start` does that makes the
agent module the wrong place.

Two things to get right that this repository has already paid for. Give
`resources.ts` a real `cost`, or your budget will never bind — Marshal prices
an unpriced job at zero, and a zero-cost job is admitted by a fully exhausted
window. And **a tool's name is its filename**: `edit-workspace.ts` is the tool
`edit-workspace`. Calling `edit_workspace` does not fail loudly; Eve returns a
NoSuchToolError the model reports as text, and every session looks admitted
because the guard was never reached.

The full interface is in [Marshal's API
reference](https://github.com/Ludentes/marshal/blob/main/API.md).

## Keep this, delete that

| Keep | Delete |
|---|---|
| `agent/` — the Eve agent and its two guarded tools | `lab/` — scenarios, the runner, the timeline |
| `admission/` — the ledger, the guard, the host lease | |
| `check/` — the check below | |

Delete `lab/` and you still have a working Eve agent with admission control.
That is the whole claim, so CI enforces it: it removes `lab/`, runs
`check/no-lab.ts` — which must still see one session refused by name — then
typechecks and builds what is left. A convention nothing enforces decays on the
first commit that finds it convenient to reach across.

## Where this came from

Marshal was extracted from [Galatea](https://github.com/Ludentes), where it
admits agent work against real repositories. The budget windows in
`admission/resources.ts` carry a measurement from that system: the weekly
allowance bound about 6.7× harder than the 5-hour one, so admission has to
satisfy *every* window rather than the loosest. Pacing to the looser figure
drains the week in a day.

Marshal imports nothing outside `node:`, and a test enforces it.

## And then what?

This repository covers admission and nothing else. For durability, deployment
and hosting of Eve agents, see
[`vercel-labs/steve`](https://github.com/vercel-labs/steve).

## License

MIT.
