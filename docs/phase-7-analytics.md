# Phase 7 — Comparison, exports and mission archive

Phase 7 extends Phases 1–6. Phase 8 has not started. No scheduling implementation was changed.

## Comparison

The comparison page supports 2–8 policies, a shared process editor (up to 20 processes), calculator input transfer, random datasets, all 16 lecture input loaders, row editing/add/remove/reset and explicit per-policy configuration editors. The visible JSON configuration supports the engine schema; a button explicitly loads each algorithm's lecture configuration. Missing quanta, priority directions, queue policies or interqueue decisions are reported for the corresponding algorithm, rather than silently supplied.

Each run snapshots the shared IDs, arrival times, bursts and metadata and invokes the existing Worker-backed simulation service sequentially. Single-queue policies omit queue-level metadata only at the engine boundary; the shared editor retains it. This accommodates the engine's single-queue validation without changing a process's CPU workload. Queue-based policies receive the stated assignments. The comparison metadata editor exposes priorities on every row and queue levels 1–8 independently of any particular policy.

Results include WT, TT, RT, utilization, throughput, makespan and busy/idle time. The table sorts numerical columns, highlights the selected inspector and marks every tied goal winner. Six responsive Recharts charts use stable algorithm colors and visible numerical descriptions. Deterministic insights rank successful results for the selected workload only. The display rounds to four decimals; exports retain numerical precision. Context-switch overhead is excluded, and no potentially misleading switch count is reported.

Side-by-side proportional SVG overview strips reuse the existing Gantt export generator with a shared time domain. One existing interactive Phase 4 chart can be selected for playback, inspection and PNG/SVG exports. Keeping one interactive inspector also avoids duplicate control IDs and competing playback sessions. Editing inputs or configurations marks the preceding comparison outdated, cancels pending work and disables its exports/inspection. Comparison workspace state resets when leaving its route.

## Exports

Calculator Mission Files exports input CSV, result CSV, versioned dataset JSON and a client-generated PDF. Result exports and Save Mission require a current successful calculation; editing disables stale-result exports. Comparison exports include CSV, copyable results with a manual-copy field, and a PDF with the comparison table and six metric charts, followed by every algorithm's inputs, exact configuration, proportional timeline, exact interval strips, full result table, substituted mathematical solutions and assumptions.

CSV quotes fields, doubles embedded quotes, retains multiline fields and protects spreadsheet formula prefixes. JSON contains only version, processes and configuration. PDF generation uses [jsPDF](https://parall.ax/products/jspdf), loaded on demand. Reports paginate text, tables, chart groups and interval strips. Eight-algorithm reports include full educational solutions and can be long; the verified five-process example produced 65 pages. The report does not copy arbitrary DOM screenshots or invent values.

PNG and SVG remain the existing Phase 4 exports based on actual intervals. Comparison overview strips use the same SVG builder with an optional shared domain. Image export bounds remain those documented in Phase 4.

## Storage and import

`cpu-scheduling-lab.missions.v1` stores at most 100 input-only saved missions with schema version, unique ID, name (1–100 characters), timestamp, optional notes (up to 2000 characters), process dataset and scheduling configuration. Loading restores the shared calculator draft and invokes the current engine. Stored calculated values are never trusted or loaded.

The Mission Archive supports search, algorithm filtering, date ordering, load, rename, duplicate, individual deletion and confirmed clear-all. Individual deletions also require confirmation. Write errors retain the prior archive and show quota/storage feedback. Reads validate every dataset, version, ID and record. Corruption yields a visible warning and blocks accidental saving over the damaged record; an explicit clear action recovers it. Only the mission key is changed; theme and Phase 6 learning progress are preserved. Archive changes from another tab become visible on revisiting/reloading the archive.

JSON import accepts files or pasted text, validates before showing a replacement confirmation, and applies nothing until that confirmation. It rejects malformed JSON, extra properties, unsupported versions, invalid process/configuration values and files above 250 KB. Editable imports support up to 20 processes with P-number IDs (up to P1000000), canonical zero-based row order, and the calculator's supported configuration controls. Scheduled promotions and custom engine limits are rejected explicitly because the calculator editor cannot restore those fields. Imported results must be recalculated.

No account, server or external analytics service is used. All storage is browser-local; exports download to the user's device. Separate tab writes are not transactional, so avoid editing the same archive simultaneously in multiple tabs.

## File inventory

Created:

- `src/pages/AlgorithmComparison.tsx`, `src/pages/MissionArchive.tsx`
- `src/components/MissionFiles.tsx`
- `src/utils/comparisonEngine.ts`, `src/utils/csvExport.ts`, `src/utils/datasetImportExport.ts`, `src/utils/simulationStorage.ts`, `src/utils/reportExport.ts`
- `src/tests/comparison.test.ts`, `src/tests/export.test.ts`, `src/tests/storage.test.ts`, `src/tests/phase7.test.tsx`
- `docs/phase-7-analytics.md`

Modified:

- `src/App.tsx`: comparison/archive routes and existing shared calculator transfer.
- `src/pages/CalculatorPage.tsx`: Mission Files controls.
- `src/components/ProcessEditor.tsx`: optional comparison metadata mode; calculator behavior preserved.
- `src/utils/ganttExport.ts`: optional shared time domain for overview strips.
- `src/styles/learning.css`: responsive comparison and archive styles.
- `src/tests/App.test.tsx`: requested comparison page title.
- `vite.config.ts`: separate analytics chunk with ordered execution.
- `package.json`, `package-lock.json`: jsPDF dependency.
- `src/components/Navigation.tsx`, `src/layouts/AppLayout.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/SupportingPages.tsx`, `README.md`: current feature/status copy.

## Verification

Baseline: 399 tests across 11 files passed before implementation. New unit tests cover all eight policies sharing identical CPU workloads, engine equivalence, individual configuration errors, exact ties for every optimization goal, cancellation, actual CSV/PDF/SVG output, version validation, corrupt storage, quota failures and preserving learning progress. New integration tests verify actual lecture averages (FCFS 6.8, SJF 5.2), six chart data panels, stale export protection, saving, archive rename/duplicate and cancellation of archive clearing.

Production browser review additionally verified all eight Worker-generated results, goal ties, 390px/320px containment, CSV/JSON/PDF/PNG/SVG downloads, actual PNG rendering, archive save/load with recalculation, and confirmed JSON replacement disabling prior result exports. The eight-algorithm PDF was downloaded and rendered; geometric validation found zero characters outside any of its 65 pages. Representative pages were visually inspected. Browser review uses a separate local preview origin to preserve the user's existing local progress.

Artifacts and exact final test/build results are recorded under `.qa/phase-7-*`. The engine-hash audit compares all 18 Phase 6 baseline files; all match. The screenshot is `.qa/phase-7-comparison-desktop.jpg`. The final PDF is `.qa/phase-7-final-comparison.pdf`.

Final execution results: `npm run check` passed TypeScript, warning-free lint, **413 tests across 15 files** in **311.70 seconds**, and the production build. After revising PDF pagination/table/timeline layout, **six focused export/integration tests passed** in 31.84 seconds. The final TypeScript and lint checks passed again; the final production build completed in **5.11 seconds** without bundle-size or ineffective-import warnings. Analytics and PDF generation are separate chunks. Logs: `.qa/phase-7-final-checks.txt`, `.qa/phase-7-final-focused.txt`, `.qa/phase-7-final-build.txt`. No browser errors or warnings were recorded. The temporary QA preview on port 5174 was stopped; the user's existing development server was left alone.

Stop after Phase 7. Wait for the user's Phase 8 instruction.
