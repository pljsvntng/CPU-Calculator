import type { FormulaModel } from '../../utils/resultFormatting'
import { formulaResult } from '../../utils/resultFormatting'
export function FormulaExplanation({ model, expanded, onToggle }: { model: FormulaModel; expanded: boolean; onToggle: () => void }) {
  return <section className={`formula-explanation ${expanded ? 'formula-expanded' : ''}`} aria-label={model.title}>
    <div className="formula-heading"><div><h3>{model.title}</h3><p className="mono" title={model.value === null ? 'Undefined' : `Unrounded value: ${model.value}`}>{formulaResult(model)}</p></div><button type="button" className="text-link formula-toggle" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} formula for ${model.title}`}>{expanded ? 'Hide Formula' : 'Show Formula'}</button></div>
    {expanded && <div className="formula-body">{model.terms && model.terms.length > 0 && <dl className="formula-terms">{model.terms.map(term => <div key={term.label}><dt>{term.label}</dt><dd className="mono">{term.value}</dd></div>)}</dl>}
      <p className="mono symbolic-formula">{model.formula}</p><p className="mono">{model.substitution}</p>{model.exact !== model.substitution && <p className="mono">{model.exact}</p>}<p className="mono formula-answer">{formulaResult(model)}</p><p className="formula-note">{model.note}</p>
    </div>}
  </section>
}
