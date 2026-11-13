import { memo, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { SchedulingResult } from '../../types/scheduling'
import { CrewAvatar } from '../CrewAvatar'
import { processColor, processColorIndex } from '../../utils/simulationView'
import { hasPriority, hasQueues, sortedProcesses, resultTableText } from '../../utils/resultFormatting'
import type { ResultSortKey } from '../../utils/resultFormatting'
import { CopyResultButton } from './CopyResultButton'
export const SchedulingResultsTable = memo(function SchedulingResultsTable({ result, outdated, selectedId, onSelect }: {
  result: SchedulingResult; outdated: boolean; selectedId: string | null; onSelect: (id: string) => void
}) {
  const [sort, setSort] = useState<{ key: ResultSortKey; direction: 'ascending' | 'descending' }>({ key: 'id', direction: 'ascending' })
  const rows = useMemo(() => sortedProcesses(result.processes, sort.key, sort.direction), [result, sort])
  const priority = hasPriority(result), queues = hasQueues(result)
  const sortBy = (key: ResultSortKey) => setSort(previous => ({ key, direction: previous.key === key && previous.direction === 'ascending' ? 'descending' : 'ascending' }))
  const header = (label: string, key: ResultSortKey, tooltip: string, name: string) => <th scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}><button type="button" className="table-sort" onClick={() => sortBy(key)} aria-label={`Sort by ${name}`} title={tooltip}>{label}{sort.key === key && (sort.direction === 'ascending' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button></th>
  return <><div className="results-table-toolbar"><p>Select a crewmate to inspect its formulas and highlight every matching Gantt interval.</p><CopyResultButton label="Copy Table Data" text={resultTableText(result, rows)} disabled={outdated} /></div>
    <div className="mobile-results-sort"><label htmlFor="mobile-result-sort">Sort results</label><select id="mobile-result-sort" value={sort.key} onChange={event => setSort(previous => ({ ...previous, key: event.target.value as ResultSortKey }))}><option value="id">Process ID</option><option value="arrivalTime">Arrival time</option><option value="burstTime">Burst time</option><option value="completionTime">Completion time</option></select><button type="button" className="button secondary small" onClick={() => setSort(previous => ({ ...previous, direction: previous.direction === 'ascending' ? 'descending' : 'ascending' }))} aria-label="Toggle result sort direction">{sort.direction === 'ascending' ? 'Ascending' : 'Descending'}</button></div>
    <div className="table-scroll" role="region" aria-label="Calculated process results" tabIndex={0}><table className="calculated-table educational-result-table"><caption className="sr-only">{outdated ? 'Previous calculated results — outdated' : 'Calculated process results'}</caption><thead><tr>
      {header('Process P', 'id', 'Process ID · numeric ID ordering', 'process ID')}{header('AT', 'arrivalTime', 'Arrival Time', 'arrival time')}{header('BT', 'burstTime', 'Burst Time', 'burst time')}{header('ET / CT', 'completionTime', 'Execution/Completion Time (ET). CT is a common alternative term.', 'completion time')}
      <th scope="col"><abbr title="Turnaround Time (TT). TAT is a common alternative term.">TT / TAT</abbr></th><th scope="col"><abbr title="Waiting Time">WT</abbr></th><th scope="col"><abbr title="Response Time: First Start Time minus Arrival Time">RT</abbr></th>{priority && <th scope="col">Priority</th>}{queues && <><th scope="col">Initial Queue</th><th scope="col">Final Queue</th></>}
    </tr></thead><tbody>{rows.map(process => <tr key={process.id} className={selectedId === process.id ? 'selected-process-row' : ''} data-result-process={process.id} data-selected={selectedId === process.id}>
      <th scope="row" aria-label={process.id} style={{ borderLeft: `3px solid ${processColor(process.id).value}` }}><button type="button" className="result-process-button" onClick={() => onSelect(process.id)} aria-label={`Select process ${process.id}`} aria-pressed={selectedId === process.id}><CrewAvatar processId={processColorIndex(process.id)} size={24} /><strong className="mono">{process.id}</strong></button></th>
      {[process.arrivalTime, process.burstTime, process.completionTime, process.turnaroundTime, process.waitingTime, process.responseTime].map((value, index) => <td key={index} data-label={['Arrival (AT)', 'Burst (BT)', 'Completion (CT)', 'Turnaround (TAT)', 'Waiting (WT)', 'Response (RT)'][index]} className={`mono ${index >= 2 && index <= 4 ? 'lecture-value' : ''}`}>{String(value)}</td>)}
      {priority && <td data-label="Priority" className="mono">{process.priority ?? '—'}</td>}{queues && <><td data-label="Initial queue" className="mono">{process.queueLevel ?? 1}</td><td data-label="Final queue" className="mono">{process.currentQueueLevel}</td></>}
    </tr>)}</tbody></table></div>
    {queues && <p className="table-queue-note">Initial and final queues are engine assignments. {result.algorithm === 'MLFQ' ? 'Per-interval queue levels and all feedback movements appear in the crewmate details and execution log.' : 'MLQ membership is fixed; process priorities apply only to queues using a priority policy.'}</p>}
  </>
})
