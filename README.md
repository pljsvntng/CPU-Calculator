# CPU Scheduling Lab

Phase 6 of 8: Crewmate Academy, eight detailed lessons, 16 lecture worked examples, deterministic practice missions, verified answer checking, interactive quizzes and browser-local learning progress. Existing result tables, formulas, Gantt playback and calculator remain available. Built with React, strict TypeScript, Vite, Tailwind CSS, React Router, Lucide React, and bundled fonts. Recharts remains installed for later visualizations. Phase 6 adds no dependencies and leaves the scheduling engine unchanged. Phase 7 has not started.

The [Phase 2 engine guide](docs/phase-2-engine.md) contains the API, all scheduling assumptions, file inventory, validation limits, and a page-by-page lecture audit. The public entry point is `src/engine/scheduler.ts`.

The [Phase 3 calculator guide](docs/phase-3-calculator.md) documents the integration, complete file inventory, configuration controls, lecture examples, tests, and phase boundary.

The [Phase 4 visualization guide](docs/phase-4-visualization.md) documents the SVG chart, playback and queue-snapshot semantics, export paths, complete file inventory and browser limitations.

The [Phase 5 solutions guide](docs/phase-5-solutions.md) documents exact formulas, result sorting/copying, synchronized process selection and walkthrough state, source discrepancies and the complete file inventory.

The [Phase 6 Academy guide](docs/phase-6-academy.md) documents lessons, quizzes, practice generation, scoring, validation, local progress, source corrections and the Phase 6 file inventory.

## Run locally

Use a current Node.js LTS release compatible with Vite (this project was verified with Node 24 and npm 11).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. To bind specifically to the local IPv4 interface:

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

## Project checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run check` runs all four checks. `npm run test:watch` starts interactive testing. `npm run preview` serves the production build locally after `npm run build`.

## Phase 6 features

- Eight detailed Academy lessons and all 16 audited lecture examples with live engine results, Gantt playback and substituted formulas.
- Seeded practice across three difficulties, editable numerical and Gantt answers, normalized scoring, progressive hints, retry and full solution review.
- Sixteen study quizzes covering conceptual rules and engine-derived numerical/timeline questions.
- Validated local progress, best scores, confirmed reset and optional earned achievements. No account or external progress service.
- Exact input/configuration transfer to the main calculator, with shared application state.

## Retained Phase 5 features

- Complete ET/CT, TT/TAT, WT and RT tables, conditional priority/queue columns, natural process-ID and numeric sorting, selected-crewmate highlighting, clipboard copying and an explicit manual-copy fallback.
- Individual substituted formulas, first-start and completion timestamps, every execution interval, exact integer sums/fractions for averages, busy/idle/observed time, CPU utilization, throughput and makespan. Only displayed quotients are rounded; no benchmark ratings are invented.
- Show/Hide Formula, Expand All, Collapse All and Copy Calculations. Formula text wraps on small screens; interval lists and event logs are paginated without discarding entries.
- A dedicated Mission Execution Log tab with Explain My Schedule, previous/next event, restart and all recorded steps. It shares the Phase 4 playback state, ready-queue snapshots, selected process and timeline highlights.
- Stale reports/solutions remain clearly marked; edits stop playback and disable copying/walkthrough execution until successful recalculation. Verified scheduling implementations remain unchanged.

## Retained Phase 4 features

- Reusable SVG `SchedulingGanttChart` with exact proportional intervals, real time coordinates, idle periods, resumed turns, queue details, stable process colors, compact labels and keyboard/touch interval inspection.
- Zoom in/out/reset, fit-to-screen with practical scrolling for dense schedules, an expanded fullscreen view, full-schedule SVG export and actual canvas PNG export. Image exports are capped at 16,000px wide to bound memory.
- Play/pause, previous/next event, restart, speed 0.5×/1×/2×/4× and time seeking. Mission Status uses the engine's ordered queue snapshots, running process, remaining bursts and explanations, with completed crew and active-interval highlights.
- Playback stops on stale edits, hidden documents and unmounts. Old charts are clearly labeled; successful recalculation resets the playback session. Native fullscreen falls back to an accessible expanded view when unavailable.

## Retained Phase 3 features

- FCFS, SJF, NPP, SRTF, PP, RR, MLQ, and MLFQ all run through the existing engine. Module Web Workers keep calculations off the browser UI thread; edits cancel pending jobs and late responses are discarded.
- Editable crew with stable IDs/colors, add/remove/clear/reset/sample controls, preserved hidden values when switching algorithms, keyboard navigation, and inline validation. Invalid configurations cannot be calculated.
- Dynamic settings: priority conventions; RR quantum (default 2); MLQ queue priorities, policies, quanta, assignments and preemption; MLFQ levels, final policy, quanta, supported demotion, initial assignments, aging and boosting.
- Sixteen audited lecture datasets load their inputs and required configuration and automatically calculate. Configurable random generation creates valid inputs for the selected policy.
- Mission reports display real process timings, totals and metrics after consistency checks. Edits label previous results outdated and provide a Recalculate action. Results, segments and event logs remain in root state across navigation.
- Responsive desktop/tablet/mobile layouts, contained horizontal table scrolling, accessible labels and preserved light/dark themes.

## Preserved foundation features

- Seven routed pages: Dashboard, Scheduling Calculator, Compare Algorithms, Learning Center, Practice Mode, Saved Calculations, and About; plus a recovery page for unknown URLs.
- Compact desktop sidebar, native modal mobile navigation, page titles, breadcrumbs, help dialog, skip link, keyboard focus styles, and route-change focus management.
- Spaceship dark mode by default, an optional light mode, and locally persisted theme preferences. Previously saved light/dark preferences are honored. Fonts are bundled; no remote font service is required.
- Mission-control dashboard with eight algorithm modules, scheduling groups, two lecture learning outcomes, and a clearly conceptual SVG observation deck.
- Selectable learning library with algorithm descriptions, considerations, lecture page references, deep links, and input-configuration links.
- Editable calculator input draft: up to 20 processes; add/remove rows; arrival, burst, and conditional priority fields; conditional Round Robin quantum; accessible whole-number validation; horizontally scrollable tables with pinned process IDs.
- Stable red, blue, green, yellow, pink, cyan, orange, and purple process identities with reusable crewmate SVG avatars. P9–P20 use deterministic extended colors; visible process IDs remain unique. Removing a process does not recolor the others.
- Reset Crew clears process inputs. Load Mission replaces the process draft with five clearly labeled example inputs, without generating results. These controls preserve the selected algorithm and time quantum.
- A functional interactive CPU Execution Timeline, substituted calculation formulas and a dedicated execution-log walkthrough. The Crewmate Academy now extends the eight conceptual explanations with complete lessons, quizzes and worked examples; Training Missions provides Easy, Medium and Hard exercises.

## Files and architecture

```text
public/
  favicon.svg                  CPU identity mark
src/
  App.tsx                      Route definitions and in-memory input draft
  main.tsx                     React entry, router, and bundled font imports
  index.css                    Tailwind entry, design tokens, themes, responsive styles
  styles/
    spaceship.css              Mission-control theme and responsive visual layer
  components/
    AlgorithmCard.tsx          Linked overview item
    CrewAvatar.tsx             Reusable lightweight process-crew SVG
    SpaceshipScene.tsx         Static observation-deck SVG illustration
    Navigation.tsx             Brand and reusable navigation
    ProcessEditor.tsx          Process table, row actions, numeric fields
    ui.tsx                     Panel, intro, empty-state, upcoming badge
  layouts/
    AppLayout.tsx              Sidebar, topbar, mobile drawer, help, page shell
  pages/
    DashboardPage.tsx
    CalculatorPage.tsx
    LearningPage.tsx
    SupportingPages.tsx        Compare, practice, saved, about, and 404 pages
  algorithms/
    README.md                  Reserved implementation boundary
  engine/
    README.md                  Reserved orchestration/metrics boundary
  types/
    index.ts                   Algorithm metadata and input draft types
  utils/
    theme.ts                   Theme initialization and persistence
    validation.ts              Whole-number input validation
  data/
    algorithms.ts              Eight algorithms and two learning objectives
    crew.ts                    Stable process color identities
    missionExample.ts          Editable training inputs; no calculated values
    navigation.ts              Route metadata and navigation icons
  tests/
    setup.ts                   jsdom, matchers, cleanup, dialog/media mocks
    App.test.tsx               Navigation, themes, library, drafts, future-state checks
    validation.test.ts         Input boundary cases
    crew.test.ts               Color order and repeat mapping
```

Root setup files: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `.gitignore`, and this README.

The file tree above describes the retained Phase 1 UI. Phase 2 adds the scheduling model, eight policy modules, simulation kernel, metrics, independent numeric validation, presets, fixtures, and tests; the complete added-file inventory is in the engine guide. Existing form validation stays separate from engine validation.

## Lecture alignment

Content was reviewed against the supplied `Lecture-5.pdf` (30 pages): learning outcomes on page 2, groups on pages 3–4, and algorithm sections on pages 5–28. Interface prose is paraphrased. Clarifying notes correctly distinguish the FCFS convoy effect from starvation and explain that multilevel queue behavior depends on configured policies. Lecture files are not copied into the public bundle.

The Vite and Tailwind setup follows their official documentation: [Vite guide](https://vite.dev/guide/) and [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).

## Current limitations and phase boundary

- Comparisons, grading and saved-result storage remain later-phase work. Exact formulas, educational event explanations, interactive timelines, real playback and image exports are functional.
- The UI supports up to 20 processes and 8 queues. MLFQ exposes the engine's supported feedback rules; no I/O bursts, voluntary blocking or context-switch costs are modeled. See the engine guide for numeric and event-count safety bounds.
- The calculator draft and latest successful report survive in-app navigation in the current tab, including algorithm deep links. A full reload or a new tab starts a blank draft. Only the theme preference is persisted.
- Phase 6 rechecked the original PDF and corrected page 19 P3 priority from the app's earlier transcription of 2 to the printed 1. It now matches the chart; the earlier discrepancy claim was incorrect. Queue examples explicitly apply their audited interqueue behavior.
- No authentication, backend, or deployment is included. Production hosting must serve `index.html` for app routes (SPA fallback).
- Automated dialog tests use a jsdom shim; actual native modal and Escape behavior require browser verification.

Stopped after Phase 6. Phase 7 requires a separate instruction.

## Verification

- Phase 6: `npm run check` passed strict TypeScript, warning-free lint, **399 tests across 11 files**, and production build. Final mobile-focus/source-label changes passed **60 focused integration tests**, TypeScript and lint again, followed by the final **4.55-second** build. All 18 engine hashes match. Desktop/light tablet/390px/320px browser review verified practice grading, full solutions, exact Worker-backed calculator transfer, quizzes, reset cancellation and contained scrolling, with no warnings or errors. See [the Phase 6 guide](docs/phase-6-academy.md) for file inventory, scoring, source correction and evidence. Phase 7 has not started.
- Phase 5: `npm run check` passed strict TypeScript, lint with no warnings, **301 tests across 9 files** (266 retained tests plus 35 new results/explanation checks), and the production build. The serial suite took 250.47 seconds on the shared desktop. After clarifying queue-policy wording, all 11 policy-explanation checks passed again and the final production build completed in 5.11 seconds. Logs: `.qa/phase-5-checks.txt`, `.qa/phase-5-policy-notes-tests.txt`, `.qa/phase-5-final-build.txt`.
- Phase 5 browser review covered the production build: real Worker-backed FCFS calculations, exact P2 substitutions, clipboard table/calculation copies, completion sorting, event-8 synchronization at time 5 with P2 selected/running, stale edit protection, recalculation resetting time to 0, light tablet mode, and 20-process equations at 320px. The mobile document stayed within its viewport and no formula body overflowed. The final production tab recorded no browser errors or warnings.
- Historical Phase 5 proof: `.qa/phase-5-worked-solution.jpg` shows the actual P2 calculation panel; `.qa/phase-5-copied-calculations.txt` contains the clipboard payload. All 18 engine baseline hashes remained unchanged. Its page 19 discrepancy claim was corrected during the Phase 6 source audit described above.
- Phase 4: final `npm run check` passed strict TypeScript, Oxlint with no warnings, **266 tests across 8 files** (227 retained tests plus 39 visualization/playback/export checks), and the production build. Tests took 65.44 seconds; Vite built in 3.61 seconds. jsdom workers are bounded at 2 for consistent execution on a shared desktop CPU. Log: `.qa/phase-4-checks.txt`.
- Phase 4 browser review verified actual Worker-backed MLFQ intervals, playback through completion, exact event stepping, repeated arrow-key navigation, hover/touch inspection, zoom/fit, expanded-view state, stale input cancellation and recalculation, dark desktop/light tablet themes, and 390px/320px scrolling with visible final timestamps. Native fullscreen was unavailable in the in-app browser; the functional expanded fallback was verified. No browser warnings or errors were observed.
- Both Phase 4 image buttons downloaded actual files. The PNG was opened and inspected; standalone SVG and raster samples are `.qa/phase-4-export.svg` and `.qa/phase-4-export.png`. UI screenshot: `.qa/phase-4-timeline-desktop.jpg`. All 18 engine baseline hashes match. No Phase 5 formula implementation was added.
- Phase 3: final `npm run check` passed strict TypeScript, Oxlint, **227 tests across 7 files** (124 existing engine tests, 33 retained foundation tests, and 70 new form/integration/worker tests), and the production build. Test duration: 71.74 seconds; Vite build: 5.35 seconds. The production module Worker was emitted successfully. Log: `.qa/phase-3-checks.txt`.
- Phase 3 browser review: real Worker calculations for FCFS, MLQ and MLFQ; successive lecture algorithm loads; outdated reports and recalculation; exact requested FCFS results; mobile navigation; dark desktop at 1440px, light tablet at 768px, and narrow layouts at 390px/320px. Tables scroll inside their panels without document overflow. No browser warnings or errors were recorded. Report screenshot: `.qa/phase-3-report-desktop.png`.
- Phase 3 preservation: all 18 baseline engine/policy/type/metrics/validation source hashes match. Existing routes, learning modules, theme behavior, sample controls and stable crew colors remain covered. No Phase 4 visualization was started.
- Phase 2: `npm run check` passed strict TypeScript, Oxlint, **157 tests (124 engine + 33 existing)**, and the production build. The [engine guide](docs/phase-2-engine.md) includes lecture audit details, test coverage, API usage, and current limitations. Existing interface source hashes match the Phase 2 baseline.
- Baseline before redesign: 28 existing Vitest / React Testing Library tests passed.
- `npm run check` after redesign: strict TypeScript, Oxlint, 33 Vitest / React Testing Library tests, and the production build passed. Existing assertions were retained, with visible-label expectations updated for the requested mission terminology; five checks were added for default theme, sample/reset controls, process identity, future engine controls, and color mapping.
- Browser review: desktop layout, light/dark themes, editable calculator controls, selectable learning content, 320px and 390px layouts, contained horizontal table scrolling, mobile navigation, and native Help dialog Escape handling.
- During the Phase 1 redesign, scheduling metadata and input validation were preserved. Phase 2 now implements the previously reserved algorithm/engine directories while retaining the interface and its validation.
- No browser console errors were observed during the review. Screenshots and local check logs are saved under the ignored `.qa/` directory.

