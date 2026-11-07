import { Panel } from './ui'
import { NumberField } from './NumberField'
import { algorithms } from '../data/algorithms'
import { MLQ_LECTURE_PRESET, MLQ_LECTURE_SECOND_PRESET, MLFQ_PRESET_1_2, MLFQ_PRESET_2_3 } from '../data/schedulingPresets'
import { applyConfiguration, MAX_QUEUES, needsProcessPriority, resizeQueues } from '../utils/calculator'
import type { FormErrors } from '../utils/calculator'
import type { CalculatorDraft, QueueDraft } from '../types'
import type { SchedulingConfig } from '../types/scheduling'

export function SchedulingSettings({ draft, errors, onChange }: {
  draft: CalculatorDraft; errors: FormErrors; onChange: (draft: CalculatorDraft) => void
}) {
  const feedback = draft.algorithm === 'MLFQ'
  const multi = feedback || draft.algorithm === 'MLQ'
  const queues = feedback ? draft.mlfqLevels : draft.mlqQueues
  const prefix = feedback ? 'mlfq' : 'mlq'
  const updateQueues = (values: QueueDraft[]) => onChange({ ...draft, [feedback ? 'mlfqLevels' : 'mlqQueues']: values })
  const updateQueue = (level: number, change: Partial<QueueDraft>) => updateQueues(queues.map(queue => queue.level === level ? { ...queue, ...change } : queue))
  const preset = (config: SchedulingConfig) => onChange({ ...applyConfiguration(draft, config), source: null })
  return <Panel title="SCHEDULING SETTINGS" caption="Only policies and options supported by the verified engine are available." action={<span className="badge neutral mono">{draft.algorithm}</span>}>
    <div className="settings-body">
      {(draft.algorithm === 'FCFS' || draft.algorithm === 'SJF' || draft.algorithm === 'SRTF') && <p className="settings-description">{draft.algorithm === 'FCFS' ? 'No extra settings. Arrival time, then original input order, determines each turn.' : draft.algorithm === 'SJF' ? 'Non-preemptive: choose the shortest available CPU burst and run it to completion.' : 'Preemptive: a strictly shorter remaining burst interrupts the running process. Equal remaining times keep the current process running.'}</p>}
      {needsProcessPriority(draft) && <div><label className="field-label" htmlFor="priority-direction">Priority convention</label><select id="priority-direction" value={draft.priorityDirection} onChange={event => onChange({ ...draft, priorityDirection: event.target.value as CalculatorDraft['priorityDirection'] })}><option value="lower-first">Lower number = Higher priority</option><option value="higher-first">Higher number = Higher priority</option></select><p className="field-hint">Equal priorities use arrival time, then original input order. Equal-priority arrivals do not preempt.</p></div>}
      {draft.algorithm === 'RR' && <NumberField id="quantum" label="Time quantum q" value={draft.quantum} minimum={1} error={errors.quantum} onChange={quantum => onChange({ ...draft, quantum })} hint="Positive whole number. Arrivals at a turn boundary join before the unfinished process is requeued." />}
      {multi && <>
        <div className="preset-actions"><span className="field-label">Lecture 5 presets</span>{feedback ? <><button type="button" className="button secondary small" onClick={() => preset(MLFQ_PRESET_2_3)}>RR 2 / RR 3 / SJF</button><button type="button" className="button secondary small" onClick={() => preset(MLFQ_PRESET_1_2)}>RR 1 / RR 2 / SJF</button></> : <><button type="button" className="button secondary small" onClick={() => preset(MLQ_LECTURE_PRESET)}>NPP / SRTF</button><button type="button" className="button secondary small" onClick={() => preset(MLQ_LECTURE_SECOND_PRESET)}>PP / SJF</button></>}</div>
        <div><label className="field-label" htmlFor="queue-count">{feedback ? 'Number of queue levels' : 'Number of queues'}</label><select id="queue-count" value={queues.length} onChange={event => updateQueues(resizeQueues(queues, Number(event.target.value), feedback))}>{Array.from({ length: MAX_QUEUES - (feedback ? 1 : 0) }, (_, i) => i + (feedback ? 2 : 1)).map(count => <option key={count}>{count}</option>)}</select><p className="field-hint">Workspace limit: {MAX_QUEUES} queues. Existing policies and assignments are retained when resizing; unsupported intermediate feedback policies must be corrected explicitly.</p></div>
        {queues.map((queue, index) => {
          const allowed = feedback ? (index === queues.length - 1 ? ['RR', 'SJF', 'FCFS'] : ['RR']) : ['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR']
          return <fieldset className="queue-settings" key={queue.level}><legend>Queue {queue.level}{feedback && queue.level === 1 ? ' · highest priority' : ''}</legend><div className="queue-settings-grid">
            <div><label className="field-label" htmlFor={`${prefix}-policy-${queue.level}`}>Queue {queue.level} scheduling policy</label><select id={`${prefix}-policy-${queue.level}`} value={queue.policy} onChange={event => updateQueue(queue.level, { policy: event.target.value as QueueDraft['policy'] })} aria-invalid={!!errors[`${prefix}.${queue.level}.policy`]} aria-describedby={errors[`${prefix}.${queue.level}.policy`] ? `${prefix}-policy-${queue.level}-error` : undefined}>
              {!allowed.includes(queue.policy) && <option value={queue.policy} disabled>{queue.policy} · unsupported at this level</option>}
              {allowed.map(id => <option key={id} value={id}>{id} · {algorithms.find(a => a.id === id)!.name}</option>)}
            </select>{errors[`${prefix}.${queue.level}.policy`] && <span className="field-error" id={`${prefix}-policy-${queue.level}-error`}>{errors[`${prefix}.${queue.level}.policy`]}</span>}</div>
            {!feedback && <NumberField id={`mlq-priority-${queue.level}`} label={`Queue ${queue.level} priority`} value={queue.priority} error={errors[`mlq.${queue.level}.priority`]} onChange={priority => updateQueue(queue.level, { priority })} />}
            {queue.policy === 'RR' && <NumberField id={`${prefix}-quantum-${queue.level}`} label={`Queue ${queue.level} time quantum`} value={queue.quantum} minimum={1} error={errors[`${prefix}.${queue.level}.quantum`]} onChange={quantum => updateQueue(queue.level, { quantum })} />}
          </div></fieldset>
        })}
        <label className="checkbox-control"><input type="checkbox" checked={feedback ? draft.mlfqPreemption : draft.mlqPreemption} onChange={event => onChange({ ...draft, [feedback ? 'mlfqPreemption' : 'mlqPreemption']: event.target.checked })} />Preempt lower-priority queues</label>
        <p className="field-hint">On: a higher queue can interrupt. Off: the active policy reaches its next scheduling boundary. Same-queue SRTF/PP preemption still applies.</p>
        {!feedback && <p className="settings-description">Fixed queue membership. Smaller queue priority numbers run first; equal queue priorities use the smaller level number. Process priority uses the convention selected above.</p>}
        {feedback && <>
          <div className="feedback-rule"><strong>Demotion behavior</strong><p>Demote one level after using a full RR quantum while unfinished. A higher-level interruption retains unused quantum. Promotion or boost resets it. The final level keeps its membership.</p></div>
          <label className="checkbox-control"><input type="checkbox" checked={draft.agingEnabled} onChange={event => onChange({ ...draft, agingEnabled: event.target.checked })} />Enable waiting-time aging</label>
          {draft.agingEnabled && <NumberField id="aging-interval" label="Aging interval" value={draft.agingInterval} minimum={1} error={errors.agingInterval} onChange={agingInterval => onChange({ ...draft, agingInterval })} hint="Promote a continuously waiting job one level after this many time units. Running time does not count." />}
          <label className="checkbox-control"><input type="checkbox" checked={draft.boostEnabled} onChange={event => onChange({ ...draft, boostEnabled: event.target.checked })} />Enable periodic priority boosting</label>
          {draft.boostEnabled && <NumberField id="boost-interval" label="Priority boost interval" value={draft.boostInterval} minimum={1} error={errors.boostInterval} onChange={boostInterval => onChange({ ...draft, boostInterval })} hint="Return arrived, unfinished jobs to level 1 with fresh budgets at each global interval." />}
          <p className="field-hint">CPU-only model: no voluntary blocking or I/O bursts. Initial queue assignments are supported; the default is queue 1.</p>
        </>}
      </>}
    </div>
  </Panel>
}
