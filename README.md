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
