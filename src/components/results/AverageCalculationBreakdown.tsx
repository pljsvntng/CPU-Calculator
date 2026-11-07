import { memo, useMemo, useState } from 'react'
import type { SchedulingResult } from '../../types/scheduling'
import { Panel } from '../ui'
import { performanceFormulas, resultCalculationText } from '../../utils/resultFormatting'
import { FormulaExplanation } from './FormulaExplanation'
import { CopyResultButton } from './CopyResultButton'
export const AverageCalculationBreakdown = memo(function AverageCalculationBreakdown({ result, outdated }: { result: SchedulingResult; outdated: boolean }) {
  const models = useMemo(() => performanceFormulas(result), [result])
  const copy = useMemo(() => resultCalculationText(result), [result])
  const [open, setOpen] = useState(() => new Set(['average-waiting']))
  return <Panel title="MISSION PERFORMANCE SUMMARY" caption="Exact integer sums and fractions; rounded display values only."><div className="formula-toolbar"><button type="button" className="button secondary small" onClick={() => setOpen(new Set(models.map(model => model.id)))}>Expand All</button><button type="button" className="button secondary small" onClick={() => setOpen(new Set())}>Collapse All</button><CopyResultButton label="Copy Calculations" text={copy} disabled={outdated} /></div>
    <div className="average-formula-grid">{models.map(model => <FormulaExplanation key={model.id} model={model} expanded={open.has(model.id)} onToggle={() => setOpen(previous => { const next = new Set(previous); if (next.has(model.id)) next.delete(model.id); else next.add(model.id); return next })} />)}</div>
  </Panel>
})
