import { useState } from 'react'
import { Plus, Trash2, RotateCcw, FolderOpen, Eraser } from 'lucide-react'
import { Panel } from './ui'
import { NumberField } from './NumberField'
import { CrewAvatar } from './CrewAvatar'
import { getCrewColor } from '../data/crew'
import { createFeedbackExample, createMissionExample } from '../data/missionExample'
import { blankProcess, MAX_CREW, needsProcessPriority } from '../utils/calculator'
import type { FormErrors } from '../utils/calculator'
import type { CalculatorDraft, ProcessInput } from '../types'

export function ProcessEditor({ draft, errors, onChange, metadataMode = false }: {
  draft: CalculatorDraft; errors: FormErrors; onChange: (draft: CalculatorDraft) => void; metadataMode?: boolean
}) {
  const [undo, setUndo] = useState<{ processes: ProcessInput[]; nextProcessId: number } | null>(null)
  const needsPriority = metadataMode || needsProcessPriority(draft)
  const needsQueue = metadataMode || draft.algorithm === 'MLQ' || draft.algorithm === 'MLFQ'
  const queues = metadataMode ? Array.from({length:8}, (_,i)=>({level:i+1,policy:'metadata'})) : draft.algorithm === 'MLQ' ? draft.mlqQueues : draft.mlfqLevels
  const update = (id: number, field: 'arrival' | 'burst' | 'priority' | 'queue', value: string) => {
    onChange({ ...draft, processes: draft.processes.map(process => process.id === id ? { ...process, [field]: value } : process) })
  }
  const replace = (processes: ProcessInput[], nextProcessId: number, label: string) => {
    setUndo({ processes: draft.processes.map(p => ({ ...p })), nextProcessId: draft.nextProcessId })
    onChange({
    ...draft, processes, nextProcessId, source: { label, note: 'Editable input draft. Run Start Simulation to calculate its schedule.' },
  })
  }
  return <Panel title="PROCESS CREW" caption="Edit your process inputs. Each crewmate keeps its process ID and color." action={<span className="badge neutral mono">{draft.processes.length} / {MAX_CREW} CREW</span>}>
    {errors.processes && <p className="form-notice error-note">{errors.processes}</p>}
    <div className="table-scroll" role="region" aria-label="Process inputs, scroll horizontally on smaller screens" tabIndex={0}>
      <table className="process-table"><caption className="sr-only">Editable process input draft</caption><thead><tr><th scope="col">Process ID</th><th scope="col">Arrival time <span className="mono">AT</span></th><th scope="col">Burst time <span className="mono">BT</span></th>{needsPriority && <th scope="col">Priority</th>}{needsQueue && <th scope="col">{draft.algorithm === 'MLFQ' ? 'Initial queue' : 'Queue assignment'}</th>}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{draft.processes.map(process => <tr key={process.id}>
          <th scope="row"><span className="crew-identity" data-process-id={process.id} data-crew-color={getCrewColor(process.id).name}><CrewAvatar processId={process.id} size={29} /><span><strong className="mono">P{process.id}</strong><span className="crew-color-name">{getCrewColor(process.id).name}</span></span></span>{errors[`process.${process.id}.id`] && <span className="field-error">{errors[`process.${process.id}.id`]}</span>}</th>
          <td data-label="Arrival time"><NumberField id={`arrival-${process.id}`} label={`P${process.id} arrival time`} value={process.arrival} hiddenLabel error={errors[`process.${process.id}.arrival`]} onChange={value => update(process.id, 'arrival', value)} /></td>
          <td data-label="Burst time"><NumberField id={`burst-${process.id}`} label={`P${process.id} burst time`} value={process.burst} minimum={1} hiddenLabel error={errors[`process.${process.id}.burst`]} onChange={value => update(process.id, 'burst', value)} /></td>
          {needsPriority && <td data-label="Priority">{metadataMode || needsProcessPriority(draft, process) ? <NumberField id={`priority-${process.id}`} label={`P${process.id} priority`} value={process.priority} hiddenLabel error={errors[`process.${process.id}.priority`]} onChange={value => update(process.id, 'priority', value)} /> : <span className="not-required">Not required by this queue</span>}</td>}
          {needsQueue && <td data-label={draft.algorithm === 'MLFQ' ? 'Initial queue' : 'Queue assignment'}><label className="sr-only" htmlFor={`queue-${process.id}`}>P{process.id} queue assignment</label><select id={`queue-${process.id}`} value={process.queue} onChange={event => update(process.id, 'queue', event.target.value)} aria-invalid={!!errors[`process.${process.id}.queue`]} aria-describedby={errors[`process.${process.id}.queue`] ? `queue-${process.id}-error` : undefined}>
            {!queues.some(q => String(q.level) === process.queue) && <option value={process.queue}>Invalid queue {process.queue || '(empty)'}</option>}
            {queues.map(queue => <option key={queue.level} value={queue.level}>Queue {queue.level} · {queue.policy}</option>)}
          </select>{errors[`process.${process.id}.queue`] && <span className="field-error" id={`queue-${process.id}-error`}>{errors[`process.${process.id}.queue`]}</span>}</td>}
          <td><button type="button" className="button remove-button" aria-label={`Remove process P${process.id}`} title={`Remove process P${process.id}`} onClick={() => replace(draft.processes.filter(p => p.id !== process.id), draft.nextProcessId, `P${process.id} removed`)}><Trash2 size={14} aria-hidden="true" /><span>REMOVE</span></button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="process-actions"><button type="button" className="button primary small" aria-label="Add Crewmate (Add Process)" disabled={draft.processes.length >= MAX_CREW} onClick={() => onChange({ ...draft, processes: [...draft.processes, blankProcess(draft.nextProcessId)], nextProcessId: draft.nextProcessId + 1 })}><Plus size={16} aria-hidden="true" /> ADD PROCESS</button>
      <div className="crew-utilities">
        <button type="button" className="button secondary small" title="Remove all rows" onClick={() => replace([], draft.nextProcessId, 'Crew cleared')}><Eraser size={14} aria-hidden="true" /> CLEAR ALL</button>
        <button type="button" className="button secondary small" title="Start a fresh process draft with one blank P1" onClick={() => replace([blankProcess(1)], 2, 'Fresh process draft')}><RotateCcw size={14} aria-hidden="true" /> RESET</button>
        <button type="button" className="button secondary small" title="Load Mission (Load Example): replace the process draft with training inputs" onClick={() => replace(draft.algorithm === 'MLFQ' ? createFeedbackExample() : createMissionExample(), 6, 'Sample mission inputs loaded')}><FolderOpen size={14} aria-hidden="true" /> LOAD EXAMPLE</button>
      </div>
    </div>
    {undo && <div className="input-recovery" role="status"><span>Previous inputs saved for recovery.</span><button type="button" className="button secondary small" onClick={() => { onChange({ ...draft, ...undo, source: null }); setUndo(null) }}>Undo input replacement</button></div>}
    <p className="crew-input-note">Whole numbers · one shared time unit · up to {MAX_CREW} processes. Switching algorithms preserves hidden fields. Reset, sample, lecture, and random loaders replace the process draft.</p>
    {needsQueue && <p className="crew-input-note">Changing queue count keeps existing assignments. Correct any assignment to a removed queue before running.</p>}
  </Panel>
}

