import type { SchedulingResult } from '../../types/scheduling'
import type { SimulationPlayback } from '../../hooks/useSimulationPlayback'
import { simulationView } from '../../utils/simulationView'
import { displayNumber } from '../../utils/formatting'
import { CrewmateProcessIcon } from './CrewmateProcessIcon'
export function MissionStatus({ result, playback, outdated }: { result: SchedulingResult; playback: SimulationPlayback; outdated: boolean }) {
  const view = simulationView(result, playback.time, playback.eventIndex)
  return <section className="mission-live" aria-label="MISSION STATUS">
    <div className="mission-live-heading"><h3>MISSION STATUS</h3><span className={`badge ${outdated ? 'upcoming' : view.runningId ? 'verified-badge' : 'neutral'}`}>{outdated ? 'PREVIOUS RESULT' : view.runningId ? 'CPU RUNNING' : 'CPU IDLE'}</span></div>
    <dl className="live-summary"><div><dt>Current Simulation Time</dt><dd className="mono">{displayNumber(playback.time)}</dd></div><div><dt>Running Process</dt><dd>{view.runningId ? <CrewmateProcessIcon id={view.runningId} running /> : 'None'}</dd></div><div><dt>Completed Processes</dt><dd className="mono">{view.completed.length}/{result.processes.length}</dd></div></dl>
    <div className="ready-snapshot"><h4>READY QUEUE <span className="mono">ENGINE SNAPSHOT</span></h4>{view.readyQueues.length ? view.readyQueues.map(queue => <div className="ready-level" key={queue.queueLevel}><span className="mono">{result.algorithm === 'MLQ' || result.algorithm === 'MLFQ' ? `Q${queue.queueLevel}` : 'READY'}</span><div>{queue.processIds.length ? queue.processIds.map(id => <CrewmateProcessIcon key={id} id={id} />) : <span className="muted">Empty</span>}</div></div>) : <p className="muted">Before the first recorded event.</p>}</div>
    <div className="remaining-snapshot"><h4>REMAINING BURST TIMES</h4><ul>{view.processes.map(process => <li key={process.id} data-process-state={process.state}><CrewmateProcessIcon id={process.id} running={process.state === 'running'} completed={process.state === 'completed'} /><span className="mono">{displayNumber(process.remaining)}</span><span>{process.state.replaceAll('-', ' ')}</span></li>)}</ul></div>
    <section className="event-inspector" aria-label="Scheduling event step" aria-live={playback.playing ? 'off' : 'polite'}>
      <div><span className="eyebrow">ENGINE EVENT</span><span className="mono">{playback.eventIndex + 1} / {result.events.length}</span></div>
      {view.event ? <><h4>{view.event.type.replaceAll('-', ' ')}{view.event.processId ? ` · ${view.event.processId}` : ''}</h4><p className="mono">Timestamp {view.event.timestamp} · sequence {view.event.sequence}</p><p>{view.event.explanation}</p></> : <><h4>Ready for playback</h4><p>Press Play to advance CPU time or Next Step to inspect the first recorded decision.</p></>}
      <p className="snapshot-note">Queues and ordering come from this event’s snapshot. Remaining time decreases only for the running process between events. Dispatch transitions take no CPU time.</p>
    </section>
  </section>
}
