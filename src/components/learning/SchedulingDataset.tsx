import type { SchedulingRequest } from '../../utils/calculator'

export function SchedulingDataset({ request, source }: { request: SchedulingRequest; source: string }) {
  const { config, processes } = request
  const priority = processes.some(p => p.priority !== undefined), queue = processes.some(p => p.queueLevel !== undefined)
  return <div className="training-dataset"><p className="source-note">{source}</p>
    <div className="training-table-scroll" tabIndex={0} role="region" aria-label="Problem process dataset"><table className="training-table"><caption>Process inputs · shared CPU time units</caption><thead><tr><th scope="col">Process</th><th scope="col">AT</th><th scope="col">BT</th>{priority && <th scope="col">Priority</th>}{queue && <th scope="col">Queue</th>}</tr></thead><tbody>{processes.map(p => <tr key={p.id}><th scope="row">{p.id}</th><td>{p.arrivalTime}</td><td>{p.burstTime}</td>{priority && <td>{p.priority ?? '—'}</td>}{queue && <td>Q{p.queueLevel}</td>}</tr>)}</tbody></table></div>
    <div className="training-config"><strong>{config.algorithm} policy</strong><ul>
      <li>Ties use arrival time, then original input order; running jobs retain equal-priority or equal-remaining-time ties. Switch cost: 0.</li>
      {(config.algorithm === 'NPP' || config.algorithm === 'PP' || config.algorithm === 'MLQ') && <li>Process priorities: {config.priorityDirection === 'higher-first' ? 'higher numbers first' : 'lower numbers first'}.</li>}
      {config.algorithm === 'RR' && <li>Quantum: {config.quantum}. Boundary arrivals enter before requeueing unfinished work.</li>}
      {(config.algorithm === 'MLQ' || config.algorithm === 'MLFQ') && <li>Interqueue preemption: {config.interqueuePreemption === false ? 'deferred until the current turn boundary' : 'strict; a higher queue can interrupt'}.</li>}
      {config.algorithm === 'MLQ' && config.queues.map(q => <li key={q.level}>Q{q.level}: queue rank {q.priority} (lower first), {q.policy.algorithm}{q.policy.algorithm === 'RR' && `, q = ${q.policy.quantum}`}. Fixed membership.</li>)}
      {config.algorithm === 'MLFQ' && <><li>Full unfinished RR budget demotes one level. Higher-level interruption retains unused quantum.</li>{config.levels.map(q => <li key={q.level}>Q{q.level}: {q.policy.algorithm}{q.policy.algorithm === 'RR' && `, q = ${q.policy.quantum}`}.</li>)}<li>Aging: {config.agingInterval ?? 'off'}; global boost: {config.boostInterval ?? 'off'}; scheduled promotions: {config.priorityPromotions?.length ?? 0}.</li></>}
    </ul></div></div>
}
