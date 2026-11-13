import type { FeedbackLevel } from '../types/scheduling'
export function demotionDescription(level: FeedbackLevel) {
  const rule = level.demotion ?? { kind: level.policy.algorithm === 'RR' ? 'quantum' : 'none' }
  switch (rule.kind) {
    case 'quantum': return 'Demote after a full unfinished RR quantum'
    case 'service': return `Demote after ${rule.budget} CPU service units`
    case 'dispatches': return `Demote when dispatch ${rule.count} ends unfinished (no forced interruption)`
    case 'none': return 'No automatic demotion'
  }
}
