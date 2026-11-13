# Mobile interface and configurable MLFQ

## Inspection and implementation plan
The existing React / TypeScript / Vite app uses React Router, controller hooks, CSS with Tailwind, Lucide and Recharts. A pure event-driven TypeScript scheduler runs through a worker. Routes cover home, calculator, lessons, practice, comparison, archive and about.

Gaps: intermediate MLFQ restricted to RR; no non-RR demotion; defaults RR(2)/RR(3)/SJF; only combined Gantt; small touch targets and typography; mobile table inputs; heavy borders and shadows; no bottom navigation; destructive actions lack recovery.

Plan: extend validated feedback configuration and accounting, retain single algorithms and MLQ, align queue views with the authoritative timeline, use mobile input cards, add bottom navigation, refine shared styling, provide input recovery, then test scheduling and real layouts at every requested width.

## Interface
The existing mission/crewmate identity is retained with restrained navy and blue surfaces, softer borders, consistent Inter typography, readable helper text, clear validation, and larger controls in both themes. Home, calculator, comparison, archive, lessons and practice share these styles.

At phone widths, process input rows become labeled two-column cards and result rows become metric cards. Mobile result sorting remains available. Input labels stay programmatically associated with their fields. The calculator has a sticky editing toolbar with Calculate plus jumps to Processes and Settings; it ends with the form so it does not cover the report. The primary bottom navigation contains Home, Calculator, Lessons, Practice and More. More opens the existing complete route menu. Safe-area padding and content space keep the bottom navigation clear of the final content. Dialogs scroll within the viewport and explicitly wrap keyboard focus. Native Escape closes them.

Reset, Clear All, Load Example and individual process removal retain a recoverable input snapshot, exposed through Undo input replacement. Algorithm switching retains compatible process fields. The MLFQ-specific example uses staggered arrivals and long bursts so all three levels and interruption behavior are visible; other algorithms keep their original example.

## Supported queue policies and defaults
Every MLFQ queue supports FCFS, SJF (non-preemptive), SRTF, NPP (non-preemptive priority), PP (preemptive priority), and RR. The existing project does not implement HRRN, so it is deliberately absent. The six policy implementations are shared with existing standalone and MLQ scheduling.

| Queue | Default policy | Default movement |
| --- | --- | --- |
| Q1, highest | RR, quantum 2 | Unfinished job demotes after its full quantum |
| Q2, medium | RR, quantum 4 | Unfinished job demotes after its full quantum |
| Q3, lowest | FCFS | Runs until completion or higher-level interruption |

The workspace still supports 2–8 levels and advanced initial assignments. New inputs start in Q1. Lecture RR2/RR3/SJF and RR1/RR2/SJF presets retain their original configurations and fixtures.

## Demotion, interruption and deterministic ordering
A queue's scheduling policy and movement rule are separate:

- **Quantum:** RR only. Demote an unfinished job when its quantum is exhausted.
- **CPU service budget:** all supported policies. Accumulate CPU units at that level, excluding time waiting or interrupted. Exhaustion ends the turn and demotes the unfinished job. This is explicit MLFQ feedback, not a fabricated quantum for SJF/FCFS/priority.
- **Dispatch count:** demote when the configured Nth (or later) dispatch ends unfinished due to policy preemption, interqueue preemption, or RR expiration. Every resume counts as a dispatch. This rule does not itself interrupt a non-preemptive turn; FCFS with no interruption may finish without demoting.
- **None:** no automatic demotion. RR still rotates at quantum boundaries. A non-RR upper queue with no movement rule can keep all work at that level; the interface explains this configuration.

RR defaults to quantum demotion; non-RR defaults to none. At the final queue, expiration requeues instead of demoting. A final FCFS service-budget requeue starts a new queue-entry position. Completion wins over simultaneous quantum/budget exhaustion, so finished work never demotes.

Strict queue priority and interqueue preemption are enabled by default: the CPU runs only one process, from the highest ready level. A higher-level interruption retains remaining burst, unused RR quantum and unused service budget. Interrupted RR turns return to the front; ordinary quantum expiration rejoins the tail after same-time arrivals. A non-RR policy reselects at each dispatch according to its policy. Promotion and global boosting reset both budgets, dispatch counts and queue-entry time.

Feedback FCFS uses entry time into the current queue, then input order. SJF/SRTF compare remaining CPU time; priority policies use the selected numeric convention. Their ties use original arrival then input order. Only strictly better SRTF/PP candidates interrupt within a queue. Simultaneous arrivals use original input order. Queues use ascending level order. At a timestamp, the engine handles completion, arrivals, quantum/service boundaries, scheduled promotions, aging, boosting, preemption, then dispatch. Event transitions consume no CPU time.

Waiting-time aging promotes one level after continuous READY waiting; CPU execution is excluded. Periodic boosting returns arrived unfinished work to Q1, preserving ready order before the interrupted running job. Both are optional and disabled by default; strict priority can otherwise starve lower levels under sustained arrivals. Deferred interqueue preemption remains available for legacy lecture configurations and is explicitly labeled nonstandard MLFQ.

## Synchronized Gantt charts
The combined CPU timeline is authoritative. QueueTimelines projects its exact segments into one view per configured level (three by default). No queue is simulated independently. All charts share the same linear scale, boundaries, playhead, zoom, and single horizontal scroll container. Every busy CPU interval appears in exactly one active queue row. A muted block means another level is using the CPU; IDLE means the entire CPU is idle. Process colors are stable across views.

Queue headings show policy, quantum when relevant, and the movement rule. Tapping or keyboard-activating a queue block selects its real interval in the existing inspector; its exact start, end, duration, remaining work and queue are available even when the interval is too narrow for a label. Existing interval navigation, playback, fullscreen and combined-timeline SVG/PNG export remain. Visible intervals are virtualized for long timelines. Time labels use the existing collision avoidance.

The educational event log records arrivals, selections, starts, preemptions, quantum/service exhaustion, demotions, promotions and completions, with snapshot state and reasons. Policy descriptions now explain the actual configured movement rules. Results derive from the one combined history:

- CT: final end time; TAT = CT − AT; WT = TAT − original BT; RT = first start − AT.
- Utilization = busy time / elapsed time × 100; throughput = completed processes / elapsed time.
- Observation begins at 0 and includes initial and intermediate idle time. Empty requests are rejected with validation messages; empty metric display data safely returns zero values.

## Preservation and limits
The existing React Router architecture, worker execution, single-policy schedulers, MLQ, lecture content and presets, quiz/practice generation and grading, calculation walkthroughs, comparison charts, import/export, local archive, themes, playback and report tools remain. No dependency was added and no project was replaced.

This remains a CPU-only, integer-time teaching model: no I/O blocking or context-switch costs. The editable workspace allows 20 processes and 8 queues; existing engine event/segment safeguards apply. HRRN is unsupported. SVG/PNG and PDF exports retain the authoritative combined CPU timeline; the synchronized per-queue views are interactive web views. Browser viewport emulation is not a substitute for physical iOS/Android keyboard and screen-reader testing.

## Modified files
| File | Change |
| --- | --- |
| src/styles/mobile.css | Shared visual refinement, phone input/result cards, primary navigation, responsive controls and chart styling |
| src/main.tsx | Loads the shared redesign stylesheet |
| src/components/Navigation.tsx | Four primary mobile routes plus More |
| src/layouts/AppLayout.tsx | Bottom navigation and dialog keyboard-focus wrapping |
| src/pages/CalculatorPage.tsx | Clearer calculator introduction and sticky mobile editing actions |
| src/components/ProcessEditor.tsx | Labeled card cells, clear actions and recoverable process replacement/removal |
| src/data/missionExample.ts | Feedback example exercising three levels and staggered arrivals |
| src/components/SchedulingSettings.tsx | All six policies at each level; demotion controls; defaults; starvation and nonstandard-mode explanations |
| src/components/results/SchedulingResultsTable.tsx | Mobile metric labels and retained mobile sorting |
| src/components/gantt/SchedulingGanttChart.tsx | Integrates queue views into shared scale, selection, scroll and playback |
| src/components/gantt/QueueTimelines.tsx | New synchronized queue charts with keyboard/tap inspection and inactive/idle explanations |
| src/components/learning/SchedulingDataset.tsx | Displays actual feedback movement settings in lessons/practice |
| src/types/index.ts | Raw form fields for movement settings |
| src/types/scheduling.ts | Validated queue policy/demotion types and service-exhaustion events |
| src/algorithms/mlfq.ts | General queue policies, priority direction and feedback FCFS ordering |
| src/engine/policy.ts | Runtime service budget, dispatch count and queue-entry state |
| src/engine/simulation.ts | Separate quantum/service accounting and configured demotion at real boundaries |
| src/utils/calculator.ts | Updated defaults, dynamic priority fields and configuration round trips |
| src/utils/schedulingValidation.ts | Validates supported policies, movement rules and downstream priority requirements |
| src/utils/feedbackRules.ts | Shared descriptions of actual movement rules |
| src/utils/explanationGenerator.ts | Queue-specific movement explanations and service-exhaustion interpretation |
| src/utils/metrics.ts | Safe empty/zero-duration display calculations |
| src/engine/README.md | Current engine integration and documentation links |
| src/tests/feedback.test.ts | Deterministic feedback traces, metrics, validation, movement and 216 mixed policy combinations |
| src/tests/feedbackUI.test.tsx | Exact queue-chart projections, keyboard/tap inspection, queue settings, preserved inputs and undo |
| src/tests/App.test.tsx | Expectations for redesigned action labels and calculator title |
| src/tests/CalculatorPage.test.tsx | Generalized intermediate queues and redesigned action labels |
| src/tests/calculatorForm.test.ts | Supported intermediate non-RR policies and updated default |
| src/tests/scheduling.test.ts | Replaces obsolete rejection of supported SJF with invalid quantum-demotion coverage |
| docs/mobile-mlfq-redesign.md | Inspection, rules, complete change inventory, verification and limitations |

## Verification evidence
Automated Edge/Chromium viewport emulation covered 320, 360, 375, 390, 412, 430, 768, 1024 and 1440 pixels. The 126 route/theme checks (7 routes × 2 themes × 9 widths) found zero horizontal page overflow and zero runtime exceptions. Another 54 populated-state checks covered all three active queues, expanded event log, MLFQ lesson, quiz feedback, MLFQ practice solution and populated comparison at all 9 widths, also with no page overflow or runtime exceptions. Real keyboard tabbing verified dialog focus wrapping; the browser also exercised queue-block inspection, navigation, practice feedback and comparison execution against the production build.

The focused feedback suite passed 34 tests, including execution conservation and recomputed metrics across all 216 three-queue policy combinations. It tests different/same arrivals, completion in Q1, movement through Q2/Q3, interrupted RR quantum, CPU idle, non-RR service budgets, dispatch limits, no demotion, both priority conventions and ties, queue-entry FCFS order, exact-boundary completion, aging/boosting, long bursts, invalid/empty input, priority validation and editable configuration round trips. The practice recheck passed all 59 tests, including identical results when problems are sent to the main calculator.

A hand-checkable tested default example uses P1 (AT=0, BT=12) and P2 (AT=8, BT=1):

| CPU interval | Running process | Active queue |
| --- | --- | --- |
| 0–2 | P1 | Q1 |
| 2–6 | P1 | Q2 |
| 6–8 | P1 | Q3 |
| 8–9 | P2 | Q1 |
| 9–13 | P1 | Q3 |

P1 has CT=13, TAT=13, WT=1, RT=0. P2 has CT=9, TAT=1, WT=0, RT=0. Busy time and elapsed time are both 13, utilization is 100%, and throughput is 2/13. The three queue views are projections of these five intervals, with inactive gaps in their original time coordinates. Short jobs that finish in higher levels correctly leave Q3 inactive.

Detailed local evidence is in the existing ignored `.qa` directory: `mobile-mlfq-responsive.json`, `mobile-mlfq-interactions.json`, `mobile-mlfq-feedback.txt`, `mobile-mlfq-practice-recheck.txt` and `mobile-mlfq-settled-tests.txt`, plus screenshots of input cards, the chart, viewport and desktop layout.


Final settled-source regression: **18 test files passed, 461 tests passed**. Command: `npm test -- --pool=vmThreads --maxWorkers=1 --reporter=dot --testTimeout=20000`. The isolated VM-thread pool avoids intermittent fork-worker startup timeouts on this Windows desktop; no tests were skipped. The suite includes the original algorithms and preserved feature modules plus the new feedback/chart coverage. Production execution was verified at `http://127.0.0.1:4173` using the built application, not only the development server.

Final `npm run typecheck`, `npm run lint` and `npm run build` all passed. The production build completed successfully, and `git diff --check` found no whitespace errors. The change inventory covers all 30 modified or added tracked-source/documentation files; no runtime or development dependency was added.
