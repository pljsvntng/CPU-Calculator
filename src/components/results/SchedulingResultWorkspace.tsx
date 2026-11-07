import { useState } from 'react'
import { BookOpen, ScrollText } from 'lucide-react'
import type { SchedulingResult } from '../../types/scheduling'
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback'
import { SimulationSessionContext } from '../../hooks/useSimulationSession'
import { MissionReport } from '../MissionReport'
import { SchedulingGanttChart } from '../gantt/SchedulingGanttChart'
import { EmptyState, Panel } from '../ui'
import { ProcessCalculationDetails } from './ProcessCalculationDetails'
import { AverageCalculationBreakdown } from './AverageCalculationBreakdown'
import { CPUUtilizationPanel } from './CPUUtilizationPanel'
import { MissionExecutionLog } from './MissionExecutionLog'

interface WorkspaceProps {
  result: SchedulingResult | null; outdated: boolean; onRecalculate: () => void; canCalculate: boolean; error: string | null
}
export function SchedulingResultWorkspace(props: WorkspaceProps) {
  const [session, setSession] = useState({ result: props.result, key: 0 })
  if (session.result !== props.result) setSession({ result: props.result, key: session.key + 1 })
  if (!props.result) return <><MissionReport {...props} /><SchedulingGanttChart result={null} /><Panel title="SCHEDULE SOLUTIONS" caption="Process calculations and an educational execution walkthrough."><EmptyState icon={BookOpen} title="No calculation details yet" description="Calculate a valid schedule to inspect exact formulas, performance totals and the recorded scheduling decisions." /></Panel></>
  return <ResultSession key={session.key} {...props} result={props.result} />
}
function ResultSession({ result, outdated, onRecalculate, canCalculate, error }: WorkspaceProps & { result: SchedulingResult }) {
  const playback = useSimulationPlayback(result, outdated)
  const [tab, setTab] = useState<'calculations' | 'log'>('calculations')
  return <SimulationSessionContext.Provider value={playback}>
    <MissionReport result={result} outdated={outdated} onRecalculate={onRecalculate} canCalculate={canCalculate} error={error} selectedId={playback.selectedProcessId} onSelect={playback.selectProcess} />
    <SchedulingGanttChart result={result} outdated={outdated} />
    <section className="educational-workspace" aria-label="Schedule solutions">
      <header className="solutions-heading"><div><p className="eyebrow">LECTURE 05 / WORKED SOLUTIONS</p><h2>Understand every result.</h2><p>{outdated ? 'Previous calculation — recalculate to update these solutions.' : 'Exact inputs, substituted formulas and the decisions behind your schedule.'}</p></div><button type="button" className="button secondary small" onClick={() => setTab('log')}><ScrollText size={15} />EXPLAIN MY SCHEDULE</button></header>
      {outdated && <div className="stale-report-note" role="status" aria-label="Outdated solutions"><strong>OUTDATED SOLUTIONS</strong><p>These formulas and event snapshots belong to the previous successful calculation. Walkthrough execution and copying stay disabled until recalculation.</p></div>}
      <div className="results-tabs" role="tablist" aria-label="Educational results" onKeyDown={event => {
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const next = event.key === 'Home' ? 'calculations' : event.key === 'End' ? 'log' : tab === 'calculations' ? 'log' : 'calculations'
          setTab(next); document.getElementById(`result-tab-${next}`)?.focus()
        }
      }}><button type="button" id="result-tab-calculations" role="tab" aria-controls="result-panel-calculations" aria-selected={tab === 'calculations'} tabIndex={tab === 'calculations' ? 0 : -1} onClick={() => setTab('calculations')}>CALCULATIONS & FORMULAS</button><button type="button" id="result-tab-log" role="tab" aria-controls="result-panel-log" aria-selected={tab === 'log'} tabIndex={tab === 'log' ? 0 : -1} onClick={() => setTab('log')}>MISSION EXECUTION LOG</button></div>
      <div role="tabpanel" id="result-panel-calculations" aria-labelledby="result-tab-calculations" hidden={tab !== 'calculations'}><ProcessCalculationDetails result={result} selectedId={playback.selectedProcessId} onSelect={playback.selectProcess} /><AverageCalculationBreakdown result={result} outdated={outdated} /><CPUUtilizationPanel result={result} /></div>
      <div role="tabpanel" id="result-panel-log" aria-labelledby="result-tab-log" hidden={tab !== 'log'}><MissionExecutionLog result={result} playback={playback} outdated={outdated} /></div>
    </section>
  </SimulationSessionContext.Provider>
}
