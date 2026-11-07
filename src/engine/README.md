# Scheduling engine

Phase 2 exposes `schedule(processes, config)` in `scheduler.ts`. Pure TypeScript policy modules provide all eight algorithms; the event-driven simulation kernel handles time, copied process state, execution histories, chronological Gantt data, educational event snapshots, and derived metrics.

No React dependency or UI integration is included. See [API, assumptions, validation, and lecture audit](../../docs/phase-2-engine.md). The Phase 1 UI remains intact until its integration phase.
