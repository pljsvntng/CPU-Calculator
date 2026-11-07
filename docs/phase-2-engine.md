# Phase 2: CPU scheduling engine

The engine is a pure, synchronous TypeScript API. It does not import React, render charts, use wall-clock time, mutate the caller's data, or assign decorative/color state. The Phase 1 interface, its routes, and its tests remain intact. Form integration is deferred to Phase 3; visual Gantt charts and step explanations remain later-phase work.

## Use the API

```ts
import { schedule } from '../src/engine/scheduler'
import type { SchedulingProcess } from '../src/types/scheduling'
import { MLFQ_PRESET_2_3, MLQ_LECTURE_PRESET } from '../src/data/schedulingPresets'

const processes: SchedulingProcess[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 5, originalInputOrder: 0 },
  { id: 'P2', arrivalTime: 2, burstTime: 3, originalInputOrder: 1 },
  { id: 'P3', arrivalTime: 4, burstTime: 4, originalInputOrder: 2 },
]

const fcfs = schedule(processes, { algorithm: 'FCFS' })
const rr = schedule(processes, { algorithm: 'RR', quantum: 2 })
const feedback = schedule(processes, MLFQ_PRESET_2_3)
const fixed = schedule(processes.map((p, i) => ({ ...p, priority: i, queueLevel: i === 2 ? 2 : 1 })), MLQ_LECTURE_PRESET)
```

`schedule` returns `algorithm`, a detached `config`, `processes` sorted by `originalInputOrder`, chronological `segments`, chronological `events`, and `metrics`. Process IDs are copied verbatim, so later UI integrations can retain stable crewmate identities. Input order numbers must be unique nonnegative integers; their supplied values, rather than array position or lexical ID sorting, break final ties.

The result contains each process's remaining/executed time, first start and final completion time, final queue level, detached execution history, turnaround, waiting, and response time. Inputs and nested configuration are copied before simulation. UI draft parsing is deliberately kept outside this API; raw text is never silently coerced to numeric engine data.

## Policy and simulation assumptions

| Area | Implemented convention |
| --- | --- |
| Workload | Finite, CPU-only jobs with one CPU burst, one CPU, no voluntary blocking, no I/O bursts, zero context-switch cost. |
| Time | Nonnegative arrival times and strictly positive bursts, all safe integers. The clock advances to events, not individual ticks. |
| Observation | Time **0 through final completion**, including initial and intermediate idle intervals. |
| FCFS | Arrival time, then original input order; no interruption. |
| SJF | Select the shortest available remaining CPU job, then arrival time and original order. Standalone non-preemptive SJF has not executed any selected job before, so remaining time equals its original burst. |
| NPP / PP | Lower numerical process priority wins by default. `priorityDirection: 'higher-first'` reverses this. Equal priorities use arrival time, then original order. Only PP permits same-queue interruption. |
| SRTF / PP ties | A running process keeps the CPU on equal remaining time / priority. Only a strictly better candidate preempts. |
| RR | FIFO insertion order. Arrivals at a quantum boundary enter before the unfinished running process rejoins the tail. Every new turn gets a new quantum. |
| MLQ membership | Every process requires a valid fixed `queueLevel`. It never changes. Each queue can use FCFS, SJF, NPP, SRTF, PP, or RR. |
| MLQ queue priority | Smaller configured queue `priority` wins; equal queue priorities break by smaller level number. Queue priority is independent of process priority direction. |
| MLQ interqueue interruption | Defaults to `true`: higher-priority ready queues can interrupt even a non-preemptive policy in a lower queue. With `false`, the active dispatch reaches its policy's next scheduling boundary. Its own SRTF/PP rule can still interrupt it. |
| Redispatch after interruption | A paused RR turn returns to its queue's front with its unused quantum. Other policies reselect according to their rule. For interrupted SJF jobs in a hierarchy, remaining CPU work is the job length used on redispatch. |
| MLFQ levels | Numbered 1 through N, with 1 highest. At least two levels; nonfinal levels use RR; the final level may use SJF, FCFS, or RR. New jobs enter level 1 unless an initial valid `queueLevel` is explicitly supplied. |
| MLFQ demotion | An unfinished process that uses its complete RR quantum is demoted one level. The last level stays fixed. Completion at the same instant suppresses quantum expiry/demotion. |
| MLFQ preemption | Higher-priority queue interruption defaults to `true`. Unused RR quantum is retained across interruption; only expiry, promotion, or boost resets it. Bottom SJF can be interrupted by a higher queue, but not by a new same-level shorter job. |
| MLFQ aging | Optional positive `agingInterval`. A ready, nonrunning job waiting continuously that many units moves up one level. Its waiting-age clock resets on enqueue and on promotion. Running time does not contribute. |
| MLFQ explicit promotion | Optional `priorityPromotions: [{ time, processId, targetQueueLevel }]` moves a job to a strictly higher level, resets its budget, and appends it there. Requests for already completed/equal/higher jobs log `promotion-skipped`. Promotions cannot precede arrival. |
| MLFQ boosts | Optional positive `boostInterval`, measured from simulation time 0. All arrived unfinished jobs move to level 1 with fresh budgets. Existing ready queues, in priority/policy order, precede the interrupted running job. Empty-system boost ticks are skipped without changing the global clock. |
| Simultaneous events | Completion; arrivals in original order; quantum expiry/demotion/requeue; explicit promotions in config order; aging in original order; periodic boost; strict preemption; dispatch. All arrivals precede requeue at a quantum boundary. |

The presets expose lecture policies without claiming unspecified rules came from the lecture:

- `MLQ_LECTURE_PRESET`: level 1 NPP, level 2 SRTF, strict interqueue priority with interruption. Reproduces page 24.
- `MLQ_LECTURE_SECOND_PRESET`: level 1 PP, level 2 SJF, interqueue interruption disabled. Reproduces page 25, including finishing P2's lower-level SJF dispatch before selecting P1.
- `MLFQ_PRESET_2_3`: RR q=2, RR q=3, final SJF; strict higher-level interruption by default.
- `MLFQ_PRESET_1_2`: RR q=1, RR q=2, final SJF; strict higher-level interruption by default.
- Set `interqueuePreemption: false` explicitly on either MLFQ preset to reproduce the lecture's deferred-turn examples. The default strict-preemption trace can legitimately differ.

## Timeline, events, and formulas

Every segment contains `processId`, `startTime`, `endTime`, `duration`, `isIdle`, and `queueLevel` for MLQ/MLFQ execution. Idle uses `processId: null` and `isIdle: true`, so a real process may safely be named `IDLE`. Durations are positive; segments cover the entire observation window without gaps or overlaps.

Arrivals that do not cause redispatch do not fragment a running segment. RR turn boundaries and queue transitions remain separate, even when the same process runs on both sides. Execution histories contain separate copies of that process's segments.

Events have stable sequence numbers, timestamps, types, process IDs when applicable, the running ID, ordered ready-queue snapshots excluding the running process, remaining-burst snapshots for arrived processes (including completed ones at zero), and explanations. Every snapshot is copied at the event time. Same-time arrival events are emitted in order, so an earlier snapshot need not yet contain every other arrival at that timestamp.

Formulas are evaluated without decimal rounding:

```text
ET/CT = final completion timestamp
TT/TAT = CT - AT
WT = TAT - BT
RT = firstStartTime - AT
Average TT/WT/RT = sum of that value / process count
Busy time = sum of executed CPU time
Idle time = sum of IDLE segment durations
Observed time = final completion time - 0
CPU utilization = busy time / observed time * 100
Throughput = completed process count / observed time
```

## Lecture verification: 16 worked examples

The 30-page supplied PDF at `C:\Users\VT COMPHONERO SERVER\Downloads\Lecture-5.pdf` was read as text and rendered. All 16 worked-example pages were visually inspected; input datasets and expected outputs were manually transcribed into `src/tests/fixtures/lectureExamples.ts`. The engine never imports these fixtures. Intermediate arrival-only subdivisions are coalesced for comparing lecture timelines; RR turns remain separately available in engine output.

Both shared datasets, listed in P1–P5 order:

- A: AT `[3,5,8,0,12]`, BT `[4,9,4,7,6]`; priority examples use `[2,1,2,1,1]`.
- B: AT `[10,8,12,3,15]`, BT `[5,4,4,3,5]`; NPP and PP priorities `[2,2,1,2,1]`. Page 19 was rechecked against the original PDF during Phase 6: P3 is 1, correcting the earlier transcription of 2.

| Page | Algorithm | Verified CT values, P1–P5 | Audit result |
| --- | --- | --- | --- |
| 6 | FCFS A | 11,20,24,7,30 | Matches lecture |
| 7 | FCFS B | 17,12,21,6,26 | Matches lecture |
| 9 | SJF A | 11,30,15,7,21 | Matches lecture |
| 10 | SJF B | 21,12,16,6,26 | Matches lecture |
| 12 | NPP A | 26,16,30,7,22 | Matches, lower number wins |
| 13 | NPP B | 26,12,16,6,21 | Matches, lower number wins |
| 15 | SRTF A | 11,30,15,7,21 | Matches; no strictly better arrival interrupts |
| 16 | SRTF B | 21,12,16,6,26 | Matches |
| 18 | PP A | 26,16,30,7,22 | Matches; equal priorities do not interrupt |
| 19 | PP B, verified priorities | 26,12,16,6,21 | Matches lecture; Phase 6 corrected P3 transcription to 1 |
| 21 | RR A, q=3 | 13,30,24,17,27 | Matches |
| 22 | RR B, q=2 | 23,14,22,6,26 | Matches |
| 24 | MLQ A | 7,16,30,26,22 | Matches with NPP/SRTF, fixed levels `[1,1,2,2,1]`, interqueue interruption on |
| 25 | MLQ B | 22,12,26,6,20 | Matches with PP/SJF, fixed levels `[1,2,2,2,1]`, interqueue interruption off |
| 27 | MLFQ A, q=2/3/SJF | 13,30,20,26,24 | Matches with deferred interqueue interruption explicitly selected |
| 28 | MLFQ B, q=1/2/SJF | 24,21,22,6,26 | Matches with deferred interqueue interruption explicitly selected |

All 16 printed examples are reproduced under the stated per-example assumptions after the Phase 6 transcription correction. All example timelines, CT values, conservation properties, and derived TT/WT/RT metrics are tested. Utilization is 100% for A and `21 / 26 * 100` for B; the lecture prints the latter rounded to 80.77%.

**Phase 6 source correction, page 19:** a fresh rendering of the original PDF confirms P3 priority 1. Earlier versions of this guide and the input fixture incorrectly transcribed 2 and blamed the reference for a discrepancy. The verified trace is idle 0–3, P4 3–6, idle 6–8, P2 8–12, P3 12–16, P5 16–21, P1 21–26. Input data, independent fixtures and the loader note are corrected. The alternative priority-2 case remains a separate arrival-order regression test. The scheduling engine and tie conventions are unchanged.

**Queue caveats:** page 25 uses PP/SJF, not the NPP/SRTF policies shown on page 24. On page 27 P4 continues its lower-level RR turn from 2–5 despite P1 arriving at 3. Page 28 similarly lets a lower-level turn continue at time 10. These traces imply deferred interqueue interruption. Page 28's small row labels appear as 2/3, but its written level list and actual 1- and 2-unit turns establish q=1/2. These differences are documented rather than hidden in special-case engine code.

## Validation and bounded output

Validation rejects empty input, blank/duplicate IDs, invalid/duplicate original order numbers, negative arrivals, nonpositive bursts, invalid optional priorities/queue levels, missing MLQ assignments, missing priority for priority queues, missing/invalid quantum, nonfinite/noninteger/unsafe numbers, unsupported algorithms/options/policies, invalid queue definitions, and invalid promotion references/times. Queue levels must be unique and contiguous from 1. No numeric string coercion occurs.

At most 10,000 processes and 1,000 queue levels are accepted. A conservative `(max arrival + sum of bursts) * process count` safe-integer bound guarantees exact integer timestamps and metric numerators. Finite output is also bounded by default:

```text
maxTransitions = 100,000
maxSegments = 50,000
maxEvents = 200,000
maxSnapshotEntries = 2,000,000
```

These positive limits can be set explicitly under `config.limits`. Snapshot limits count arrived-process entries, ready-process entries, and queue headers across all event snapshots. A huge RR workload can have inherently huge output despite integer time; exceeding a limit throws `SchedulingLimitError`. Validation throws `SchedulingValidationError`. Neither returns a fabricated or truncated result.

Tests cover all eight algorithms, known request examples, all lecture datasets, ties, initial/intermediate idle, multiple preemptions, RR quantum 1/2/3/20, boundary arrivals, fixed MLQ membership, MLFQ demotion/aging/promotion/boosts, simultaneous events, invalid inputs, resource errors, 500-process workloads, and trillion-unit time jumps. A separate tick oracle cross-checks the six single-queue policies over 20 varied workloads each. Conservation and derived-metric assertions also run across varied workloads for all eight policies.

## Files

Created: `src/types/scheduling.ts`; `src/algorithms/{fcfs,sjf,npp,srtf,pp,rr,mlq,mlfq,queuePolicy}.ts`; `src/engine/{scheduler,simulation,policy,events,errors,limits}.ts`; `src/utils/{metrics,schedulingValidation}.ts`; `src/data/schedulingPresets.ts`; `src/tests/scheduling.test.ts`; `src/tests/fixtures/lectureExamples.ts`; `src/tests/helpers/referenceScheduler.ts`; this document.

Modified: root `README.md`, `src/engine/README.md`, `src/algorithms/README.md`. Existing UI components, styles, routes, dependencies, TypeScript configuration, UI validation, and existing tests were preserved.

Phase 2 stops at engine data. No Phase 3 form integration, Phase 4 chart renderer, or Phase 5 explanation UI is included.

## Final verification results

`npm run check` completed successfully: strict TypeScript check, Oxlint, **157 tests across four files**, and Vite production build. The test count comprises **124 engine tests and all 33 pre-existing UI/input/color tests**. Final check output is saved locally at `.qa/phase-2-checks.txt`; the earlier verbose test run is at `.qa/phase-2-tests.txt`.

The dashboard, calculator, learning page, supporting pages, application layout, process editor, and spaceship stylesheet SHA-256 hashes exactly match their Phase 2 starting values. No interface source, route, dependency, or existing test was modified in this phase.

No confirmed engine calculation failures remain in the executed tests. Phase 6 corrected the page 19 input transcription after rechecking the original source; there is no page 19 priority/tie conflict in that PDF. Queue behavior assumptions, finite-output limits, and the CPU-only/no-I/O model are explicit above. This guide describes the engine phase; subsequent guides cover the integrated UI.
