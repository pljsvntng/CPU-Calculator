import { Check } from 'lucide-react'
import { CrewAvatar } from '../CrewAvatar'
import { processColorIndex } from '../../utils/simulationView'

export function CrewmateProcessIcon({ id, running = false, completed = false }: { id: string; running?: boolean; completed?: boolean }) {
  return <span className={`simulation-crew ${running ? 'is-running' : ''} ${completed ? 'is-completed' : ''}`}>
    <CrewAvatar processId={processColorIndex(id)} size={23} /><strong className="mono">{id}</strong>
    {completed && <Check size={13} aria-label="Completed" />}{running && <span className="running-dot" aria-label="Running" />}
  </span>
}
