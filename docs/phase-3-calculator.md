# Phase 3 · Interactive CPU Scheduling Calculator

The calculator now executes FCFS, SJF, NPP, SRTF, PP, RR, MLQ and MLFQ through the existing `schedule(processes, config)` API. There are no scheduling implementations in React, generated answer fixtures in the application, or decorative Gantt results. The Phase 2 policy, kernel, type, metrics and validation sources are unchanged (18 SHA-256 baseline matches).

## Data flow and state

`useCalculator` owns the raw string draft, configuration, validation errors, revision, execution status, calculation error and latest successful result at the application root. The form adapter validates required raw inputs, creates typed engine requests and invokes the existing engine validator. Hidden input values survive algorithm switches and are omitted from requests when irrelevant.

The browser runs `simulationTask` inside a Vite module Worker. The task calls the existing scheduler, then checks result consistency. The root controller checks returned data again before storing success. Checks cover process identities, segment continuity, arrival boundaries, CPU-time conservation, completion/first-start times, all derived timings and metrics. Worker failures remain errors. Environments without Worker use the same task directly.

Editing aborts the active worker, advances the draft revision and marks the previous report outdated. Generation tokens discard late responses even if a transport ignores cancellation. Navigation preserves drafts and reports; reload resets both. The calculator only responds to a new URL algorithm request, preventing an older query from undoing a lecture load while router navigation commits.

Result state retains full process states, segments, events, metrics and configuration for later components. Displayed averages use up to four decimal places, with unrounded values available on metric titles; stored results retain engine precision.

## Controls

- Crew: add, remove, clear all, reset to a blank P1, load sample inputs, load a lecture dataset or generate random inputs. Newly added IDs increase monotonically, including after deleting the highest ID. Explicit reset/load actions replace the draft. Avatars depend only on the visible process ID.
- Priority policies: lower-first or higher-first; hidden values remain intact. MLQ only requires process priority for jobs assigned to NPP/PP queues.
- RR: positive integer quantum, initially 2.
- MLQ: 1–8 queues, queue priorities, FCFS/SJF/NPP/SRTF/PP/RR policies, per-RR quantum, fixed process assignment and interqueue preemption. Smaller queue priority numbers run first; process priority convention is independent.
- MLFQ: 2–8 levels, RR intermediate levels and RR/SJF/FCFS final level, per-RR quantum, initial queue assignments, supported fixed demotion rule, optional waiting-time aging and periodic boosting. The UI explains the actual engine rule instead of offering unsupported demotion modes.
- Queue resizing preserves assignments and policies. A removed assignment or unsupported intermediate SJF/FCFS policy remains visible and invalid until explicitly corrected.
- Random options: 1–20 processes, arrival maximum 0–1000, burst maximum 1–100, priority range 0–1000 when needed. MLQ selects existing queues; MLFQ begins in level 1. Generation validates the candidate against current settings before replacing the draft.

Invalid required values and unsupported configurations show inline errors and disable Start Simulation. Programmatic form submission is also validated. Inputs are never silently clamped. The engine's independent bounds still apply.

## Lecture inputs

All 16 examples are available: pages 6–7, 9–10, 12–13, 15–16, 18–19, 21–22, 24–25 and 27–28. Loading selects the algorithm, replaces process inputs, applies required settings and calculates automatically. Every input remains editable. Production data contains inputs and audit notes only; independent expected answers stay in test fixtures.

The [Phase 2 audit](phase-2-engine.md) records the PDF review, including the Phase 6 correction: page 19 PP prints P3 priority 1. The earlier priority-2 transcription and discrepancy claim were wrong; the loader now uses the verified value and explains the correction. Page 24 MLQ uses strict interqueue preemption; page 25 uses deferred preemption. Pages 27–28 MLFQ use deferred interqueue preemption to reproduce the printed turns; the regular configurable presets retain their documented strict default. Page 28 uses the written 1/2 quanta and explains its conflicting small row labels.

## File inventory

Created:

```text
src/components/NumberField.tsx
src/components/SchedulingSettings.tsx
src/components/CrewTools.tsx
src/components/MissionReport.tsx
src/hooks/useCalculator.ts
src/services/simulationTask.ts
src/services/scheduler.worker.ts
src/services/schedulerClient.ts
src/data/lectureExamples.ts
src/utils/calculator.ts
src/utils/randomCrew.ts
src/utils/resultConsistency.ts
src/utils/formatting.ts
src/tests/calculatorForm.test.ts
src/tests/CalculatorPage.test.tsx
src/tests/schedulerClient.test.ts
docs/phase-3-calculator.md
```

Modified:

```text
src/App.tsx
src/types/index.ts
src/components/ProcessEditor.tsx
src/components/Navigation.tsx
src/layouts/AppLayout.tsx
src/pages/CalculatorPage.tsx
src/pages/DashboardPage.tsx
src/pages/LearningPage.tsx
src/pages/SupportingPages.tsx
src/data/missionExample.ts
src/styles/spaceship.css
src/tests/App.test.tsx
README.md
```

## Verification and boundary

Run `npm run check` for strict TypeScript, Oxlint, all unit/integration tests and the production build. Tests exercise form boundaries, all 16 lecture inputs, random workloads for all eight policies, result consistency, real UI calculations, independent completion values, priority/queue/quantum edits, invalid submission, engine errors, stale reports, cancellation, late responses and Worker transport cleanup. The requested FCFS workload returns CT 5/8/12, TAT 5/6/8, WT 0/3/4, average WT 7/3 and average TAT 19/3.

The existing 124 engine tests and navigation/theme/learning/input/color checks remain. Confirmed final counts and browser review details are recorded in the README verification entry and local `.qa/phase-3-checks.txt` log.

No Phase 4 Gantt renderer, playback or timeline interaction was implemented. Phase 5 detailed explanations, comparison, guided exercises and saved-result storage remain upcoming. No backend, deployment or dependencies were added. Stop after Phase 3.
