# Scheduling engine

The public pure TypeScript API is `schedule(processes, config)` in `scheduler.ts`. Runtime validation precedes immutable, event-driven simulation. Single-policy and multilevel schedulers share one clock, execution history, event log, and metric calculation; the React application invokes them through a worker.

See [original engine audit](../../docs/phase-2-engine.md) and [current configurable MLFQ and mobile redesign](../../docs/mobile-mlfq-redesign.md). The latter supersedes the original restrictions on feedback policies.
