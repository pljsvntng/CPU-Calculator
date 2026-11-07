import { memo, useState } from 'react'
import type { SchedulingResult } from '../../types/scheduling'
import { Panel } from '../ui'
import { CrewmateProcessIcon } from '../gantt/CrewmateProcessIcon'
import { processFormulas } from '../../utils/resultFormatting'
import { FormulaExplanation } from './FormulaExplanation'
export const ProcessCalculationDetails = memo(function ProcessCalculationDetails({ result, selectedId, onSelect }: { result: SchedulingResult; selectedId: string | null; onSelect: (id: string) => void }) {
  const process = result.processes.find(process => process.id === selectedId)
  return <Panel title="CREWMATE CALCULATION DETAILS" caption="Exact timestamps and substituted formulas from the selected calculated process.">
    <div className="process-calculation-picker"><label htmlFor="calculation-process">Inspect process</label><select id="calculation-process" value={process?.id ?? ''} onChange={event => onSelect(event.target.value)}><option value="" disabled>Choose a process</option>{result.processes.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}</select>{process && <CrewmateProcessIcon id={process.id} />}</div>
    {process ? <ProcessMath key={process.id} process={process} /> : <p className="result-help">This event has no process selected. Choose a crewmate to inspect its calculations.</p>}
  </Panel>
})
function ProcessMath({ process }: { process: SchedulingResult['processes'][number] }) {
  const [open, setOpen] = useState(() => new Set(['completion', 'turnaround', 'waiting', 'response']))
  const [page, setPage] = useState(0)
  const history = process.executionHistory, pages = Math.max(1, Math.ceil(history.length / 25))
  return <div className="process-math-body"><dl className="process-givens">{[['Arrival Time · AT', process.arrivalTime], ['Burst Time · BT', process.burstTime], ['First Start Time', process.firstStartTime], ['Execution/Completion Time · ET', process.completionTime], ...(process.priority === undefined ? [] : [['Priority', process.priority]])].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd className="mono">{value}</dd></div>)}</dl>
    <details className="execution-interval-details" open><summary>{process.id} execution intervals · {history.length} recorded {history.length === 1 ? 'turn' : 'turns'}</summary><p>A process may execute in several separate intervals before it completes. Response time measures the first start; waiting time includes later delays as well.</p><ol start={page * 25 + 1}>{history.slice(page * 25, page * 25 + 25).map((segment, index) => <li key={page * 25 + index}><span className="mono">{segment.startTime}–{segment.endTime}</span><span>{segment.duration} CPU units{segment.queueLevel === undefined ? '' : ` · Queue ${segment.queueLevel}`}</span></li>)}</ol>{pages > 1 && <div className="compact-pagination"><button type="button" className="button secondary small" disabled={!page} onClick={() => setPage(page - 1)}>Previous intervals</button><span>Page {page + 1} / {pages}</span><button type="button" className="button secondary small" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>Next intervals</button></div>}</details>
    <div className="process-formula-grid">{processFormulas(process).map(model => <FormulaExplanation key={model.id} model={model} expanded={open.has(model.id)} onToggle={() => setOpen(previous => { const next = new Set(previous); if (next.has(model.id)) next.delete(model.id); else next.add(model.id); return next })} />)}</div>
  </div>
}
