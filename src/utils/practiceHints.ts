import type { PracticeProblem } from '../types/learning'
import type { SchedulingResult } from '../types/scheduling'
import { algorithms } from '../data/algorithms'
export function practiceHints(problem: PracticeProblem, result: SchedulingResult) {
  const selected = result.events.find(e => e.type === 'process-selected')!, first = result.segments.find(s => !s.isIdle)!
  const candidates = problem.processes.filter(p => p.arrivalTime <= selected.timestamp).map(p => p.id)
  return [algorithms.find(a => a.id === problem.algorithm)!.principle + ' Apply the exact configuration above.', `At time ${selected.timestamp}, the first dispatch must choose among ready processes ${candidates.join(', ')}. Compare only this ready set using ${problem.algorithm}.`, `One actual interval is ${first.processId} from ${first.startTime} to ${first.endTime}. This is a partial timeline; continue applying the policy yourself.`]
}
