# Phase 6 — Crewmate Academy and training missions

Phase 6 extends the existing local React application. Phase 7 has not started. No dependencies or scheduling implementations were added or changed.

## Lessons and academic sources

`/learn` contains eight mission cards, a desktop lesson library, detailed lessons, a terminology reference and a separate quiz section. Every lesson includes selection rules, steps, advantages, limitations, common mistakes and a practice link. Completion requires calculating an example, checking the review acknowledgement and explicitly marking the lesson complete.

All 16 lecture input examples are available, two per algorithm: FCFS 6–7, SJF 9–10, NPP 12–13, SRTF 15–16, PP 18–19, RR 21–22, MLQ 24–25, MLFQ 27–28. They are input-only transcriptions. Clicking Calculate executes the existing verified engine and consistency checks. The result uses the Phase 4/5 Gantt chart, playback, complete table, process formulas, average breakdown, CPU utilization and scheduling event walkthrough. No answers from a test fixture are imported by application code.

The original `Lecture-5.pdf` remains available in Downloads. During Phase 6, a fresh PDF rendering confirmed **page 19 P3 priority is 1**. Previous phases misread it as 2 and incorrectly described a PDF/chart conflict. The input dataset, independent test fixture, loader note and earlier guides are corrected. Verified ET values are **26, 12, 16, 6, 21** for P1–P5. The priority-2 variant remains a separate regression test. Engine code and equal-priority rules are unchanged.

Queue assumptions remain explicit: page 24 uses NPP/SRTF with strict interqueue interruption; page 25 uses PP/SJF with deferred interruption. Pages 27–28 use deferred interqueue interruption. Page 28 follows the written 1/2 quanta and actual turns, with its conflicting small row labels noted. General tie rules, zero switching cost and configurable feedback conventions are identified as lab clarifications, rather than falsely attributed to the lecture.

## Practice and checking

`/practice` supports all eight algorithms, optional reproducible seeds, fresh random missions, Easy (3), Medium (4–5) and Hard (5–8) processes, and an advanced-answer option. Problems are supplemental instructional examples, labeled separately from lecture inputs. Hard arrivals include initial idle time and multiple interruption or quantum decisions where the policy supports them. Non-preemptive algorithms stay non-preemptive.

Generated requests pass the existing scheduling validator. Correct solutions execute the same engine and consistency checks as the calculator. The student's form is never filled from a solution. It accepts ET, TT and WT; advanced missions additionally require RT, three averages and CPU utilization for their associated points. The Gantt builder supports known process IDs/IDLE, editable endpoints, adding, removing and reordering rows. No schedule drawing is required.

**Numeric rules:** process metrics compare exact numeric safe integers; `5` and `5.0` are equivalent. Blank fields receive zero. Negative values, non-finite values, hexadecimal/scientific notation and malformed numbers are invalid. Averages/percentages accept an absolute tolerance of **0.00005**, with a 1e-12 floating arithmetic allowance, matching four-decimal rounding. CPU tolerance is measured in percentage points.

**Canonical Gantt policy:** the timeline starts at 0 and must be continuous, chronological and positive-duration; a process cannot run before arrival. CPU ownership and endpoints are compared numerically. Adjacent same-process intervals may be coalesced to compare continuous ownership. Additional decimal display subdivisions are accepted. RR, MLQ and MLFQ exercises explicitly assess scheduling decisions, so every verified dispatch/quantum/requeue/queue-transition endpoint must also be present in the student's rows. A merged lone-process RR or feedback turn that hides these decisions loses Gantt credit. Extra subdivisions do not lose credit.

**Scoring:** base category weights are Gantt 40, ET 20, TT 15, WT 15, advanced 10. Core missions omit advanced and normalize the remaining 90 proportionally to 100. Advanced missions use the full 100. Numerical fields share their category weight equally; the advanced category equally weights all RT fields, three averages and utilization. Gantt credit is all or nothing. Incorrect, invalid or missing answers receive no credit. The evaluation displays earned/max points, percentage, category counts, individual statuses, correct values and formulas substituted with the current problem's actual numbers.

Hints have three explicitly requested levels: policy, the actual first dispatch and ready set, then one actual partial interval. They have no penalty in study mode. A full solution requires an evaluated attempt and an explicit Show Complete Solution action. Editing makes an evaluation stale and closes the solution until checking again. Retry keeps the dataset and clears answers/hints; Generate Another creates a fresh seed. Checking an unchanged submission does not duplicate attempt history.

Send Problem to Calculator uses the root calculator controller, `draftFromRequest` and the supported algorithm query route. It transfers the exact processes and configuration, then runs the existing calculator service. Practice state survives navigation within the app; a reload clears the active mission and calculator draft.

## Quizzes, records and achievements

There are 16 study questions: a conceptual and an applied question per algorithm. Types include multiple choice, true/false, algorithm identification, next-process decisions, WT, TT, scheduling rules and Gantt interpretation. Applied answers are derived at runtime from reproducible engine results. Choice answers give immediate feedback; numeric answers grade on submission. Explanations reference the current problem. Attempts are recorded only after an answered submission.

`cpu-scheduling-lab.learning.v1` stores validated, versioned local progress: completed lessons, most recently studied algorithm, practice/quiz history, lifetime totals and best scores. Recent histories are bounded at 100 practice and 200 quiz records. Corrupted or unsupported data yields a visible warning and fresh in-memory record; blocked storage does not prevent learning. Reset requires a visible confirmation and removes only this key. No account, external server or progress telemetry is used.

Optional achievements derive from actual records. First Mission requires at least 80% in practice. Algorithm specialties require the corresponding completed lesson and 80% practice score; combined achievements require both relevant algorithms. Champion requires all eight. Opening a page does not award anything.

## File inventory

New files:

- `src/types/learning.ts`
- `src/data/algorithmLessons.ts`, `src/data/quizQuestions.ts`
- `src/utils/practiceGenerator.ts`, `src/utils/practiceScoring.ts`, `src/utils/answerChecker.ts`, `src/utils/practiceHints.ts`, `src/utils/learningProgress.ts`
- `src/hooks/useLearningProgress.ts`, `src/hooks/usePracticeMission.ts`
- `src/components/learning/SchedulingDataset.tsx`, `src/components/learning/LessonProgress.tsx`, `src/components/learning/AlgorithmLesson.tsx`, `src/components/learning/AlgorithmQuiz.tsx`
- `src/components/practice/PracticeAnswerTable.tsx`, `src/components/practice/GanttAnswerBuilder.tsx`, `src/components/practice/HintPanel.tsx`, `src/components/practice/PracticeFeedback.tsx`
- `src/pages/PracticeMissions.tsx`, `src/styles/learning.css`
- `src/tests/practice.test.ts`, `src/tests/learning.test.tsx`
- `docs/phase-6-academy.md`

Modified files:

- `src/App.tsx`: shared learning/practice controllers and calculator transfer.
- `src/pages/LearningPage.tsx`: complete Academy, retaining selectable library and calculator links.
- `src/main.tsx`: Academy/practice styles.
- `src/components/Navigation.tsx`, `src/layouts/AppLayout.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/SupportingPages.tsx`: current phase, help and feature-status copy.
- `src/data/lectureExamples.ts`: verified page 19 transcription correction.
- `src/tests/App.test.tsx`: requested Academy title.
- `src/tests/calculatorForm.test.ts`, `src/tests/scheduling.test.ts`, `src/tests/fixtures/lectureExamples.ts`: corrected lecture data while retaining the alternative equal-priority regression.
- `README.md`, `docs/phase-2-engine.md`, `docs/phase-3-calculator.md`, `docs/phase-5-solutions.md`: current phase and source correction.

Verification artifacts are under `.qa/phase-6-*`. Baseline: 301 tests passed before implementation. Phase 6 adds 98 tests, covering all policies/difficulties, calculator equivalence, rounding, partial scoring, missing/invalid inputs, canonical Gantt boundaries, hints, source examples, every quiz type, persistence/corruption and real page interactions.

## Executed verification

- `npm run check`: strict TypeScript, Oxlint with no warnings, **399 tests across 11 files**, and production build all passed. Full-suite duration: **179.50 seconds**. Log: `.qa/phase-6-checks.txt`.
- Browser review exposed two narrow-screen issues: lesson cards left the lesson far below the viewport, and absolutely positioned screen-reader labels escaped the table scroll container. Selection now scrolls/focuses the lesson workspace, and each training table establishes its own positioning context. A focused regression assertion checks focus for all eight lessons.
- Calculator transfers now supply their current lecture source or supplemental practice seed rather than retaining a previous draft's source label. Priority examples explicitly show the lower-first default even when the optional configuration field is omitted.
- After these final changes, **60 App/learning integration tests passed** in **47.55 seconds**; strict TypeScript and lint passed again, and the final production build completed in **4.55 seconds**. Logs: `.qa/phase-6-final-focused-tests.txt`, `.qa/phase-6-final-build.txt`.
- All **18 engine baseline hashes are unchanged**. Evidence: `.qa/phase-6-engine-verification.json`.
- Production browser review: dark desktop at 1440px; light tablet at 768px; hard eight-process MLFQ practice with advanced inputs; actual hints and zero credit for incorrect/missing answers; complete solution at 390px and 320px; mobile navigation; lesson selection focus; reset confirmation cancellation; conceptual feedback and numeric `10.0` accepted as `10`, with actual TT substitution `15 − 5 = 10`.
- The hard MLFQ practice result table matched the Worker-backed calculator result exactly after transfer. The final build also transferred page 19 with its accurate Academy source label and correction note. Reloading preserved the validated local training record.
- Document widths remained contained: 1425/1440 desktop, 753/768 tablet, 375/390 practice, and 305/320 complete solution. Wider answer/Gantt tables scroll inside their panels. No browser warnings or errors were recorded.
- Screenshot: `.qa/phase-6-academy-desktop.jpg`; detailed browser evidence: `.qa/phase-6-browser-review.json`. The temporary preview server was stopped after review.

## Scope and limitations

This is a browser-local study tool with an inspectable client-side answer checker, not a secure examination platform. Practice generation uses bounded supported configurations, not every possible queue setup; the full calculator exposes broader settings. Hints start at the first dispatch rather than automatically diagnosing each student step. Quiz content is a fixed 16-question study bank. Active missions reset on page reload, while learning progress persists if browser storage is available. Queue source ambiguities and the CPU-only, zero switching-cost model remain explicit. Compare Algorithms, Saved Calculations and other later-phase work retain their existing upcoming state.

Stop at Phase 6. Phase 7 requires a new user instruction.
