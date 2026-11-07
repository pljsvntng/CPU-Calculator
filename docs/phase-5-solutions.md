# Phase 5 · Accurate results and worked solutions

The existing calculator now includes complete result tables, substituted process formulas, exact average calculations, a CPU-utilization explanation, and a synchronized educational execution log. FCFS, SJF, NPP, SRTF, PP, RR, MLQ and MLFQ share the same result-driven components. No scheduling policy, simulation kernel, numeric engine validation, metrics implementation or event schema was changed.

## Tables and process selection

The mission report uses Lecture 5 terminology: P, AT, BT, ET/CT, TT/TAT, WT and RT. ET, TT and WT values are emphasized; header tooltips explain common alternative terms. Priority and initial/final queue columns appear when relevant. Queue levels for individual turns remain visible in the process's execution intervals and timeline inspector.

The table supports stable ascending/descending sorts by process ID, arrival, burst and completion. Numeric IDs sort naturally (P2 before P10). Sorting copies the result array and never mutates the engine result. Selecting a row or the process picker highlights that crewmate's visible Gantt intervals and opens its calculation details. Cyan identifies the selected crewmate, yellow identifies the active CPU interval, and white identifies the interval inspector.

Copy Table Data writes tab-separated current table rows, including optional columns and the observation window. Copy Calculations includes every process's inputs, first start, execution intervals and formulas, followed by every performance calculation. Clipboard failure provides selectable manual-copy text and never falsely reports success. Copying is disabled for stale results.

## Exact formulas and units

All process values and displayed metric values come from the verified result. Formula adapters construct substitutions and integer sums; they do not determine scheduling order or recompute an alternative schedule. The engine already validates the aggregate safe-integer range. No intermediate value is rounded.

- ET/CT is the final completion timestamp.
- TT/TAT = ET − AT.
- WT = TT − BT.
- RT = First Start Time − AT; it need not equal WT after preemption.
- Each average retains its per-process terms, integer numerator and exact fraction over the process count. Only the displayed quotient is rounded to at most four decimal places.
- Busy time sums recorded executed CPU work. In the CPU-only, zero-context-switch model, each process's executed work equals BT and the total agrees with non-idle Gantt intervals.
- Idle time sums actual idle intervals, including initial idle time.
- Observed time includes busy and idle time. CPU utilization is busy/observed × 100; throughput is completed processes/observed time.
- Makespan is final completion minus simulation origin. The current engine starts at 0, so makespan includes initial idle time.

Undefined zero-duration ratios are explicitly labeled rather than showing NaN or Infinity. Valid calculator workloads already require positive bursts, so this is a defensive presentation guard rather than a change to engine acceptance rules. Exact values are retained in state and copy output. Formula cards support Show/Hide Formula, Expand All and Collapse All. Individual process details include every separate returned execution turn, paginated in groups of 25 for long schedules.

## One shared walkthrough

`SchedulingResultWorkspace` creates one `useSimulationPlayback` session and provides it to the Phase 4 chart and Phase 5 execution log through `SimulationSessionContext`. The chart still works independently with its original standalone session. The existing hook now also supports process selection and exact event-index navigation; no second playback clock was created.

The dedicated MISSION EXECUTION LOG tab contains EXPLAIN MY SCHEDULE, previous/next step, Restart Explanation and Show All Steps. The list exposes every event through 25-event pages; selecting any entry moves the existing timeline to that sequence number, including tied timestamps. Advancing updates the selected process, playhead, active interval, ready queues and remaining bursts. Selecting a process for inspection pauses playback without changing the CPU time.

Each explanation presents the event's recorded decision and reason, arrived-process snapshot, exact ordered ready queues, running process, available comparison values, matching actual execution interval and next recorded event. Supplemental notes describe the configured selection rule, priority convention, quantum, queue priority, interqueue boundary, feedback demotion, aging or boosting. These notes use the result configuration and snapshots; they never choose a new execution order or claim an unrecorded preemption. Promotion and preemption claims remain anchored in explicit engine events.

Arrival snapshots include completed processes; queues exclude the running process. Intermediate dispatch and feedback events at a single timestamp consume no CPU time. A matching interval may be absent during an instantaneous transition, which is explained explicitly.

Edits stop playback and label the report, timeline and solutions as previous results. Copying and walkthrough execution are disabled until a successful recalculation. A failed attempt preserves the previous report with a clear error/stale state. Successful recalculation starts a fresh session, selection and formula workspace. Existing draft/result navigation behavior is preserved; a full page reload still clears session data.

## Accuracy and source discrepancies

The mandatory FCFS inputs (AT 0/2/4, BT 5/3/4) produce ET 5/8/12, TT 5/6/8, WT 0/3/4 and RT 0/3/4. Exact average WT and RT are 7/3; exact average TT is 19/3. Utilization is 100%, throughput is 3/12 and origin-based makespan is 12.

There are no formula-versus-engine discrepancies. The [lecture audit](phase-2-engine.md) includes a Phase 6 source correction: PP page 19 prints P3 priority 1, previously misread as 2. The loader and independent fixture now use 1, producing completions 26/12/16/6/21. The earlier PDF-conflict claim was incorrect. Queue examples retain their explicit interqueue conventions. No scheduling implementation was changed to match a PDF answer.

## File inventory

Created:

```text
src/components/results/SchedulingResultWorkspace.tsx
src/components/results/SchedulingResultsTable.tsx
src/components/results/PerformanceMetrics.tsx
src/components/results/ProcessCalculationDetails.tsx
src/components/results/AverageCalculationBreakdown.tsx
src/components/results/CPUUtilizationPanel.tsx
src/components/results/MissionExecutionLog.tsx
src/components/results/SchedulingWalkthrough.tsx
src/components/results/FormulaExplanation.tsx
src/components/results/CopyResultButton.tsx
src/hooks/useSimulationSession.ts
src/utils/resultFormatting.ts
src/utils/explanationGenerator.ts
src/styles/results.css
src/tests/results.test.tsx
docs/phase-5-solutions.md
```

Modified:

```text
src/components/MissionReport.tsx
src/components/gantt/SchedulingGanttChart.tsx
src/components/gantt/GanttSegment.tsx
src/hooks/useSimulationPlayback.ts
src/pages/CalculatorPage.tsx
src/pages/LearningPage.tsx
src/pages/DashboardPage.tsx
src/pages/SupportingPages.tsx
src/components/Navigation.tsx
src/layouts/AppLayout.tsx
src/main.tsx
src/tests/App.test.tsx
src/tests/CalculatorPage.test.tsx
vite.config.ts
README.md
```

## Verification and limits

Baseline: 266 existing tests passed before implementation. New checks cover the mandatory FCFS values and substitutions, all eight result tables and explanation policies, resumed intervals with distinct WT/RT, sorting and immutability, process highlights, expansion, exact clipboard payloads/manual fallback, idle/utilization/throughput/makespan, zero-window handling, feedback events, tied-event order, the single playback timer, pagination, stale results and empty/error states. Multi-action UI tests have explicit time budgets, and jsdom suites run serially to avoid resource contention on the shared desktop. Formula components memoize stable result data instead of rebuilding during every playback tick.

Run `npm run check` for TypeScript, lint, all tests and the production build. Confirmed final counts, logs and browser-review details are recorded in the README and ignored `.qa/` artifacts. The 18-file engine hash baseline is retained under `.qa/phase-5-engine-baseline.json` for preservation checks.

Existing limits remain: 20 calculator processes, 8 queues, engine event/snapshot safety bounds, session-only drafts/results, and browser-dependent native fullscreen with the existing expanded fallback. Long interval/event histories are fully accessible through pagination; tables scroll horizontally and formula text wraps on mobile. Comparison, practice grading, saved-result persistence and backend services remain outside this phase. Stop after Phase 5; Phase 6 requires a separate instruction.
