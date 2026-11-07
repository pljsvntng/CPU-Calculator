# Scheduling policies

FCFS, SJF, NPP, SRTF, PP, and RR define independent selection/preemption policies. MLQ constructs fixed-priority queues with per-queue policies. MLFQ defines demotion, aging-promotion, and boost ordering, with configurable levels. Shared clock, budget accounting, and event recording live in `src/engine/`.

Use the public `schedule` entry point in `src/engine/scheduler.ts` so runtime validation always runs. See [documented assumptions and lecture verification](../../docs/phase-2-engine.md). Conceptual UI metadata remains separate in `src/data/algorithms.ts`.
