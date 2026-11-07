import { useState } from 'react'
import { BookOpen, Shuffle } from 'lucide-react'
import { Panel } from './ui'
import { NumberField } from './NumberField'
import { lectureInputExamples } from '../data/lectureExamples'
import { algorithms } from '../data/algorithms'
import { draftFromRequest, needsProcessPriority, prepareRequest } from '../utils/calculator'
import { defaultRandomOptions, generateRandomCrew, randomOptionsErrors } from '../utils/randomCrew'
import type { CalculatorDraft } from '../types'

export function CrewTools({ draft, onChange, onLoad }: {
  draft: CalculatorDraft; onChange: (draft: CalculatorDraft) => void; onLoad: (draft: CalculatorDraft) => void
}) {
  const [page, setPage] = useState('')
  const [options, setOptions] = useState(defaultRandomOptions)
  const [error, setError] = useState<string | null>(null)
  const example = lectureInputExamples.find(item => String(item.page) === page)
  const optionErrors = randomOptionsErrors(options, needsProcessPriority(draft))
  const generate = () => {
    setError(null)
    try {
      const processes = generateRandomCrew(draft, options)
      const replacement = { ...draft, processes, nextProcessId: processes.length + 1, source: { label: 'Random crew generated', note: 'Generated inputs are editable. Start Simulation runs the verified scheduling engine.' } }
      const prepared = prepareRequest(replacement)
      if (!prepared.request) { setError(`Correct the scheduler settings first: ${Object.values(prepared.errors)[0]}`); return }
      onChange(replacement)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not generate a valid crew.') }
  }
  return <Panel title="MISSION INPUT TOOLS" caption="Load a verified lecture dataset or generate a fresh crew. Both replace the process draft.">
    <div className="crew-tools-body">
      <div className="lecture-loader"><div><label className="field-label" htmlFor="lecture-example">LOAD LECTURE EXAMPLE</label><select id="lecture-example" value={page} onChange={event => setPage(event.target.value)}><option value="">Choose a lecture example</option>{algorithms.map(algorithm => <optgroup key={algorithm.id} label={`${algorithm.id} · ${algorithm.name}`}>{lectureInputExamples.filter(item => item.config.algorithm === algorithm.id).map(item => <option key={item.page} value={item.page}>{item.label}</option>)}</optgroup>)}</select></div><button type="button" className="button secondary" disabled={!example} onClick={() => {
        if (!example) return
        setError(null)
        const replacement = draftFromRequest(example, draft)
        replacement.source = { label: `Lecture example loaded · ${example.label}`, note: example.note || 'Verified lecture inputs. Results are computed by the engine, not copied from the PDF.' }
        onLoad(replacement)
      }}><BookOpen size={16} aria-hidden="true" /> LOAD & SIMULATE</button></div>
      <p className="field-hint">Loading applies the matching algorithm and settings, then calculates a real report. All inputs remain editable.</p>
      {example?.note && <p className="lecture-audit-note">{example.note}</p>}
      <details className="random-options"><summary>Random crew settings</summary><div className="random-grid">{[
        ['count', 'Number of processes', 1], ['maxArrival', 'Maximum arrival time', 0], ['maxBurst', 'Maximum burst time', 1],
        ...(needsProcessPriority(draft) ? [['minPriority', 'Minimum process priority', 0], ['maxPriority', 'Maximum process priority', 0]] : []),
      ].map(([key, label, minimum]) => <NumberField key={key} id={`random-${key}`} label={String(label)} value={options[key as keyof typeof options]} minimum={Number(minimum)} error={optionErrors[String(key)]} onChange={value => { setOptions(previous => ({ ...previous, [key]: value })); setError(null) }} />)}</div><p className="field-hint">Generator bounds: 1–20 processes, arrival maximum 0–1000, burst maximum 1–100, and priorities 0–1000. MLQ assignments use existing queues; MLFQ starts at level 1.</p></details>
      <button type="button" className="button secondary" disabled={Object.keys(optionErrors).length > 0} onClick={generate}><Shuffle size={16} aria-hidden="true" /> GENERATE RANDOM CREW</button>
      {error && <p className="form-notice error-note" role="alert">{error}</p>}
    </div>
  </Panel>
}
