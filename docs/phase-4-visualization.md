# Phase 4 · Interactive execution visualization

`SchedulingGanttChart` consumes the existing `SchedulingResult`. FCFS, SJF, NPP, SRTF, PP, RR, MLQ and MLFQ use the same rendering and playback path. No scheduling algorithm, event snapshot or numeric engine type was changed. The Phase 4 baseline consists of the 227 passing Phase 3 tests.

## Accurate timeline

The chart uses React, TypeScript and SVG. Every rectangle is an engine execution segment: `x = left + (start − origin) × pixelsPerUnit` and `width = duration × pixelsPerUnit`. Ticks, labels and the playback pointer use this same scale. No process turns are merged, reordered or invented. Gray idle intervals remain part of the full observation window, which starts at time 0 in the current engine.

Labels stay at their actual coordinates. A collision filter hides crowded text; SVG titles and the interval inspector expose exact hidden boundary values. Narrow intervals retain their true widths. Hover, focus, tap, arrow keys and the numeric interval navigator expose process ID, start, end, duration, arrival, original burst, remaining time after the interval and queue level where supported. Remaining-after values subtract actual returned execution durations, without scheduling another sequence.

The first eight crew colors remain unchanged. P9–P20 receive deterministic additional colors shared by the input table, report, legend, timeline and live status. Additional IDs cycle the extended palette; arbitrary engine process names have stable visual hashes. Avatars appear only where the block has enough room. Process IDs remain in interval labels and the inspector regardless of block width.

Zoom In/Out, Reset Zoom and Fit to Screen change visual scale only. The duration-based natural width is bounded at 24,000px before zoom. Dense schedules above 250 intervals use a practical three-pixel average per interval as a minimum base width, including in Fit mode, and remain scrollable. Zoom ranges from 25% to 1600% and the canvas is bounded at 384,000px. Offscreen intervals are windowed for rendering; the engine result retains every interval. The interval navigator can reach any offscreen or compressed block.

## Playback and mission status

At 1× speed, one CPU unit passes per wall-clock second. Controls support 0.5×, 1×, 2× and 4×, play/pause, restart, event stepping in both directions and time seeking. Playback initially sits before the first event at time 0. Continuous playback uses the final engine event at or before its current time. Step navigation visits every sequence number, including individual arrivals, completions, queue transitions and selections at the same timestamp.

Mission Status reads running process, ordered ready queues and remaining bursts from the selected engine snapshot. Between events, only that snapshot's running process consumes additional elapsed CPU time. Unarrived processes retain their original burst and are explicitly marked not arrived. Completed processes get checkmarks. Temporary dispatch/promotion steps may have no running process at an instantaneous timestamp; the inspector explains that no CPU time elapses during those transitions. Ready queues are never reconstructed from Gantt segments.

The active interval, running crewmate, ready queue, completed crew, simulation time and event reason stay synchronized. Explanations are the engine's actual text, not new policy inference. A small running indicator respects reduced-motion preferences. Playback pauses when the document becomes hidden and clears timers on unmount. Input or settings edits stop playback and label the old timeline OUTDATED. Playback and exports stay disabled until successful recalculation, which starts a fresh playback session.

## Expanded view and exports

Fullscreen View requests the browser Fullscreen API. If unavailable or rejected, an expanded viewport dialog provides the same usable view and reports the fallback. Data, zoom, selected interval, speed and playback position are preserved when entering or leaving the view. Escape and Exit Fullscreen return to the workspace; keyboard focus is contained and restored. The in-app browser used for QA does not expose native fullscreen, so its expanded fallback was verified directly.

Export SVG constructs a standalone full-schedule SVG with inline colors, proportional blocks, labels, interval titles and exact time markers. It includes offscreen intervals and does not serialize only the visible window. Export PNG loads this SVG into a browser image, draws it on canvas and encodes a genuine PNG Blob. Both create actual downloads and release object URLs. Export failures show errors.

Exports use a width between 1000 and 16,000px (SVG helper accepts a 400px minimum). This keeps raster memory bounded. Dense exports compress the full schedule and suppress overlapping labels; SVG interval titles retain the exact values. There are no external image/font dependencies or screenshots substituted for chart data.

## Files

Created:

```text
src/components/gantt/SchedulingGanttChart.tsx
src/components/gantt/GanttSegment.tsx
src/components/gantt/GanttTimeAxis.tsx
src/components/gantt/GanttTooltip.tsx
src/components/gantt/GanttControls.tsx
src/components/gantt/GanttPlayback.tsx
src/components/gantt/MissionStatus.tsx
src/components/gantt/CrewmateProcessIcon.tsx
src/hooks/useSimulationPlayback.ts
src/utils/ganttScale.ts
src/utils/simulationView.ts
src/utils/ganttExport.ts
src/styles/gantt.css
src/tests/gantt.test.tsx
docs/phase-4-visualization.md
```

Modified:

```text
src/pages/CalculatorPage.tsx
src/main.tsx
src/data/crew.ts
src/components/Navigation.tsx
src/layouts/AppLayout.tsx
src/pages/DashboardPage.tsx
src/pages/SupportingPages.tsx
src/tests/App.test.tsx
src/tests/CalculatorPage.test.tsx
src/tests/crew.test.ts
README.md
vite.config.ts
```

Unrelated page layouts and all scheduling decisions are preserved. Phase labels/help/about copy were updated to reflect the available visualization. Existing empty-state expectations now check the real chart's waiting state; color tests now verify the requested extended palette.

## Verification and boundary

Unit/component checks cover all eight algorithms against actual engine intervals, FCFS 5:3:4 proportions, the requested five-turn SRTF example, equal durations, idle periods, exact axis coordinates, hidden labels, queue snapshots, remaining bursts, zoom invariance, dense offscreen schedules, keyboard/touch inspection, timed playback/speeds, tied event order, highlights, seeking, restart, stale input cancellation, session reset, timer cleanup, expanded-view fallback and SVG/PNG download paths. Phase 3 integration checks also verify each calculated algorithm renders a chart and that real input edits disable stale playback/exports.

Browser QA exercised real Worker results, playback to completion, event stepping, keyboard navigation, zoom/fit, expanded-view preservation, stale edits/recalculation, desktop dark and tablet light themes, 390px/320px containment and real SVG/PNG downloads. The downloaded PNG was opened and visually inspected. Local test logs, exported samples and review screenshots are retained under ignored `.qa/`.

Run `npm run check` for TypeScript, lint, all tests and the production build. Confirmed final results are recorded in the README and `.qa/phase-4-checks.txt`.

Current limits remain the Phase 3 crew/configuration bounds and the engine's event/snapshot safety bounds. Very dense schedules require zoom or interval inspection for readable labels. Native fullscreen depends on browser support; expanded view is always available. Detailed formula derivations, comparisons, exercises, persistence and backend services remain outside this phase. Stop after Phase 4; do not start Phase 5 automatically.
