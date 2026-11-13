import { useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Info, Play, ArrowUpRight } from 'lucide-react'
import { algorithms } from '../data/algorithms'
import { PageIntro, Panel } from '../components/ui'
import { ProcessEditor } from '../components/ProcessEditor'
import { SchedulingSettings } from '../components/SchedulingSettings'
import { CrewTools } from '../components/CrewTools'
import { SchedulingResultWorkspace } from '../components/results/SchedulingResultWorkspace'
import type { CalculatorController } from '../hooks/useCalculator'
import { MissionFiles } from '../components/MissionFiles'

export function CalculatorPage({ calculator }: { calculator: CalculatorController }) {
  const { draft, errors, request, status, error, latest, outdated, change, calculate } = calculator
  const recalculate = useCallback(() => { void calculate() }, [calculate])
  const [params, setParams] = useSearchParams()
  const requestedAlgorithm = algorithms.find(item => item.id === params.get('algorithm'))?.id
  const lastRequestedAlgorithm = useRef<typeof requestedAlgorithm>(undefined)
  useEffect(() => {
    // Router navigation may commit after a form update. Only a new URL request
    // may select a policy; the previous query must not undo a lecture load.
    if (requestedAlgorithm === lastRequestedAlgorithm.current) return
    lastRequestedAlgorithm.current = requestedAlgorithm
    if (requestedAlgorithm && requestedAlgorithm !== draft.algorithm) change(previous => ({ ...previous, algorithm: requestedAlgorithm, source: null }))
  }, [requestedAlgorithm, draft.algorithm, change])
  const algorithm = algorithms.find(item => item.id === draft.algorithm) ?? algorithms[0]
  const canCalculate = !!request && status !== 'running'
  const issueCount = Object.keys(errors).length
  return <>
    <PageIntro eyebrow="SCHEDULING LAB / CALCULATOR" title="CPU Scheduling Calculator" description="Build a process set, choose a scheduling policy, and understand every CPU decision."><span className="badge neutral">INTERACTIVE LEARNING</span></PageIntro>
    <div className="notice"><Info size={18} aria-hidden="true" /><p><strong>Your scheduler is ready.</strong> All eight algorithms use the verified engine. Results update only when you simulate; editing marks the previous report outdated.</p></div>
    <form id="scheduling-calculator" noValidate aria-label="CPU scheduling calculator" aria-busy={status === 'running'} onSubmit={event => { event.preventDefault(); void calculate() }}>
      <div className="calculator-quick-actions"><a href="#process-inputs">Processes</a><a href="#queue-settings">Settings</a><button type="submit" className="button primary" disabled={!canCalculate} aria-label="Calculate from quick actions"><Play size={15} aria-hidden="true" />{status === 'running' ? 'Running…' : 'Calculate'}</button></div>
      <div className="simulator-grid"><div className="simulator-inputs">
        <Panel title="ALGORITHM SELECTION" caption="Eight policies from Lecture 5. Switching preserves your process draft.">
          <div className="algorithm-select-body"><label htmlFor="algorithm-select" className="field-label">Scheduling algorithm</label><select id="algorithm-select" value={draft.algorithm} onChange={event => {
            const selected = algorithms.find(item => item.id === event.target.value)!
            change({ ...draft, algorithm: selected.id, source: null })
            setParams({ algorithm: selected.id }, { replace: true })
          }}>
            <optgroup label="Non-Preemptive">{algorithms.filter(a => a.group === 'non-preemptive').map(a => <option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}</optgroup>
            <optgroup label="Preemptive / Queue-Based">{algorithms.filter(a => a.group === 'preemptive').map(a => <option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}</optgroup>
          </select><div className="selected-algorithm-note"><span className={`badge ${algorithm.group === 'non-preemptive' ? 'blue' : 'orange'}`}>{algorithm.group === 'non-preemptive' ? 'Non-preemptive' : 'Preemptive / Queue-based'}</span><h2>{algorithm.name}</h2><p>{algorithm.description}</p><Link to={`/learn?algorithm=${algorithm.id}`} className="text-link">Read the concept <ArrowUpRight size={14} aria-hidden="true" /></Link></div></div>
        </Panel>
        <div id="process-inputs"><ProcessEditor draft={draft} errors={errors} onChange={change} /></div>
        <CrewTools draft={draft} onChange={change} onLoad={replacement => {
          setParams({ algorithm: replacement.algorithm }, { replace: true })
          void calculate(replacement)
        }} />
      </div><aside id="queue-settings" className="simulator-settings"><SchedulingSettings draft={draft} errors={errors} onChange={change} /><section className="input-guide"><h3><BookOpen size={16} aria-hidden="true" /> Pre-flight reference</h3><dl><div><dt className="mono">AT</dt><dd>When a process enters the ready queue.</dd></div><div><dt className="mono">BT</dt><dd>The positive amount of CPU time it needs.</dd></div></dl><p>Simulation starts at time 0, includes all idle periods, and assumes CPU-only processes with no context-switch cost.</p></section></aside></div>
      {draft.source && <div className="loaded-mission-note" role="status" aria-label="Input source"><strong>{draft.source.label}</strong><p>{draft.source.note}</p></div>}
      {errors.configuration && <p className="form-notice error-note" role="alert">{errors.configuration}</p>}
      {error && <p className="form-notice error-note" role="alert">Simulation failed: {error}</p>}
      <div className="run-toolbar"><div><p>{status === 'running' ? 'Simulation in progress' : issueCount ? `${issueCount} input ${issueCount === 1 ? 'issue' : 'issues'} to resolve` : outdated ? 'Draft changed — recalculate to update your report' : 'Pre-flight checks complete'}</p><span>Draft and latest report stay during navigation. Reloading resets the workspace.</span></div><button type="submit" className="button primary simulation-submit" disabled={!canCalculate} aria-label="Start Simulation (Calculate CPU Schedule)"><Play size={17} aria-hidden="true" /><span>{status === 'running' ? 'SIMULATING…' : 'CALCULATE'}<small>Calculate CPU Schedule</small></span></button></div>
      <p className="engine-status" role="status" aria-label="Calculation status">{status === 'running' ? 'The scheduling engine is running. Editing cancels this calculation.' : status === 'error' ? 'No new successful calculation was stored.' : status === 'success' && !outdated ? 'Calculation completed. Result consistency checks passed.' : issueCount ? 'Correct the highlighted fields before calculating.' : 'Ready to calculate using the scheduling engine.'}</p>
    </form>
    <MissionFiles calculator={calculator} />
    <SchedulingResultWorkspace result={latest?.result ?? null} outdated={outdated} canCalculate={canCalculate} onRecalculate={recalculate} error={error} />
  </>
}
