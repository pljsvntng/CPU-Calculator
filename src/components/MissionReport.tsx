import { ArrowRight, Table2 } from 'lucide-react'
import { Panel, EmptyState } from './ui'
import { algorithms } from '../data/algorithms'
import type { SchedulingResult } from '../types/scheduling'
import { PerformanceMetrics } from './results/PerformanceMetrics'
import { SchedulingResultsTable } from './results/SchedulingResultsTable'
export function MissionReport({ result, outdated, onRecalculate, canCalculate, selectedId = null, onSelect = () => {}, error }: {
  result: SchedulingResult | null; outdated: boolean; onRecalculate: () => void; canCalculate: boolean
  selectedId?: string | null; onSelect?: (id: string) => void; error?: string | null
}) {
  return <Panel title="MISSION REPORT — CPU SCHEDULING RESULTS" caption="Lecture 5 terminology · actual calculated results · observation starts at time 0."
    action={<span className={`badge ${outdated ? 'upcoming' : result ? 'verified-badge' : 'neutral'}`}>{outdated ? 'OUTDATED REPORT' : result ? 'CALCULATION VERIFIED' : 'AWAITING INPUT'}</span>} className={`mission-report ${outdated ? 'report-outdated' : ''}`}>
    {error && <p className="result-error-state" role="status" aria-label="Result calculation error">The current calculation failed: {error} {result ? 'The report below belongs to the previous successful calculation.' : 'No successful result is available.'}</p>}
    {!result ? <EmptyState icon={Table2} title="No calculated results" description="Complete your process crew and settings, then start the simulation. Every displayed timing will come from the verified scheduling engine." /> : <>
      {outdated && <div className="stale-report-note" role="status" aria-label="Outdated report"><strong>This report belongs to previous inputs or an earlier calculation.</strong><p>It does not describe your current draft. Correct any validation issues and recalculate.</p><button type="button" className="button secondary small" disabled={!canCalculate} onClick={onRecalculate}>RECALCULATE <ArrowRight size={14} aria-hidden="true" /></button></div>}
      <div className="report-algorithm"><span className="mono">{result.algorithm}</span><div><h3>{algorithms.find(a => a.id === result.algorithm)!.name}</h3><p>{outdated ? 'Previous successful calculation' : 'Latest successful calculation'} · CPU-only workload · zero context-switch cost</p></div></div>
      <PerformanceMetrics result={result} />
      <SchedulingResultsTable result={result} outdated={outdated} selectedId={selectedId} onSelect={onSelect} />
    </>}
  </Panel>
}
