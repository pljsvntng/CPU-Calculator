# CPU Scheduling Lab

Version 1.0.0 — final development phase complete. An Among Us–inspired, browser-local operating-systems lab for learning, calculating and comparing CPU scheduling policies. React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Recharts, jsPDF, Vitest and React Testing Library power the application. Fonts are bundled locally.

## Supported algorithms

- Non-preemptive: First Come, First Served (FCFS), Shortest Job First (SJF), Non-Preemptive Priority (NPP).
- Preemptive/queue-based: Shortest Remaining Time First (SRTF), Preemptive Priority (PP), Round Robin (RR), Multilevel Queue (MLQ), Multilevel Feedback Queue (MLFQ).

One verified scheduling engine supplies the calculator, learning examples, practice checker and comparison workspace. Calculated answers are never taken from test fixtures.

## Features

- Editable process crews, priority conventions, RR quantum, fixed and feedback queues, aging/boosting, sample/random inputs and 16 audited lecture examples.
- Complete ET/CT, TT/TAT, WT and RT tables; exact substituted formulas and averages; CPU busy/idle time, utilization, throughput and makespan.
- Proportional Gantt charts, idle periods, stable process identities, zoom, fit, expanded view, event playback, synchronized explanations and real PNG/SVG downloads.
- Eight Academy lessons, worked solutions, 16 study questions, seeded practice at three difficulty levels, editable answer timelines, scoring, progressive hints, retries and solution review.
- Comparisons of 2–8 policies on shared process inputs; six performance charts, sortable metrics, deterministic insights and all goal-specific ties.
- PDF reports, input/result/comparison CSV, validated JSON import/export, saved missions with search/filter/sort/rename/duplicate/delete and fresh recalculation on load.
- Browser-local learning progress and achievements; confirmed reset/import/deletion; light/dark themes, responsive layouts, keyboard focus and reduced-motion styles.

## Install and develop

Use **Node.js 24.x** and a compatible npm release. The lockfile supplies reproducible dependency versions.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the local URL printed by Vite. No database, API key, backend or account is needed. Never place secrets in Vite client environment variables; client assets are public.

## Test and build

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run check` executes all four checks. `npm run test:watch` runs interactive tests. Preview the built application with:

```sh
npm run preview -- --host 127.0.0.1 --port 5173
```

The production site is in `dist/`. `vite preview` is a local verification server, not a public production hosting service.

## Scheduling assumptions

The model is CPU-only, starts at time 0, includes initial/intermediate idle time and excludes I/O and context-switch overhead. It reports no potentially misleading context-switch count. Process metrics use safe integer inputs; only displayed averages are rounded.

Arrival time and original input order break dispatch ties. Equal running priority/remaining-time ties retain the running process. RR admits boundary arrivals before requeueing unfinished work. Priority direction, per-queue policy, quantum and interqueue behavior determine queue scheduling and are shown explicitly.

Lecture examples are input transcriptions; results are computed. Page 19 P3 priority is **1**, corrected during Phase 6 after the earlier transcription of 2. Queue examples require explicit assumptions: page 24 MLQ uses NPP/SRTF with strict interqueue preemption; page 25 uses PP/SJF with deferred preemption; pages 27–28 MLFQ use deferred preemption to reproduce the printed turns. Page 28 uses written quanta 1/2 and explains its conflicting small row labels. No scheduling policy was changed to force agreement with an ambiguous reference.

Detailed rules and independent verification: [engine audit](docs/phase-2-engine.md), [calculator](docs/phase-3-calculator.md), [Gantt/playback](docs/phase-4-visualization.md), [formulas](docs/phase-5-solutions.md), [Academy/practice](docs/phase-6-academy.md), [comparison/archive](docs/phase-7-analytics.md), [final readiness audit](docs/phase-8-readiness.md).

## Storage, safety and limits

- Progress and missions stay in this browser and origin. Storage can be blocked, cleared or exhausted; export important datasets. Changes across tabs are not transactional.
- The editable calculator supports 20 processes and up to eight queues. Engine resource limits stop excessive schedules without returning partial results.
- Practice grading is a client-side study aid, not a secure examination system. Integer answers are exact; advanced averages/percentages accept ±0.00005. Inaccurate fractional spellings that round to integers receive no credit.
- JSON imports are capped at 250 KB and validated before confirmed replacement. Editable imports support version 1, P-number IDs up to P1000000, canonical row order and calculator-supported configuration. Scheduled promotions/custom engine limits are rejected explicitly.
- The archive supports 100 validated input-only records. Loading always recalculates; stored output is never trusted. Corrupt storage is preserved until an explicit recovery action.
- PDF reports support eight results and at most 2,000 total intervals. For larger schedules use CSV/SVG. Full educational reports can be lengthy. Comparison overview strips above 2,000 intervals defer to the full interactive inspector instead of mounting thousands of extra SVG nodes.
- Active calculator/practice state survives navigation but resets on reload. Comparison state resets when leaving its route. Saved records persist when local storage is available.
- CSV protects spreadsheet formula prefixes. SVG text is escaped. No backend, external analytics or LLM service is used. A rendering recovery screen reloads the workspace without clearing saved records.

## Static deployment

Deployment is prepared but **has not been performed**. Host at the domain root; subdirectory hosting requires coordinated Vite base and router basename changes.

### Vercel

Import the project using the Vite framework preset, Node 24.x, build command `npm run build`, output directory `dist`. The supplied `vercel.json` adds SPA rewrites for deep links and basic security headers. See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

### Netlify

Use the supplied `netlify.toml`: Node 24, build `npm run build`, publish `dist`, and a non-forced `/*` to `/index.html` status-200 fallback. Existing assets retain normal file serving. See [Netlify's rewrite documentation](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

On another static host, serve `dist/`, preserve asset files and rewrite unknown application routes to `index.html`. Serve over HTTPS and preserve JavaScript/font MIME types. The module scheduler Worker and lazy chart/PDF chunks must remain reachable under `/assets/`.

After an explicitly authorized deployment, verify direct visits and refreshes on `/calculator`, `/learn`, `/practice`, `/compare` and `/saved`; check Worker execution, downloads, storage, mobile navigation and console errors. Local preview does not verify a provider's live configuration or provide an accessibility certification.

## Final verification

The [Phase 8 readiness audit](docs/phase-8-readiness.md) records actual automated results, browser measurements, source checks, files changed and remaining limits. Test logs, PDF renderings and screenshots are retained in the ignored `.qa/` directory. The application has completed all eight requested phases; it has not been automatically deployed.
