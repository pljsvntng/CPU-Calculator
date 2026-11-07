export function NumberField({ id, label, value, onChange, error, minimum = 0, hiddenLabel = false, hint }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string
  minimum?: number; hiddenLabel?: boolean; hint?: string
}) {
  return <div className="numeric-field">
    <label className={hiddenLabel ? 'sr-only' : 'field-label'} htmlFor={id}>{label}</label>
    <input id={id} type="number" inputMode="numeric" min={minimum} step="1" value={value}
      onChange={event => onChange(event.target.value)} placeholder={minimum === 0 ? '0 or more' : '1 or more'}
      aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
    {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
  </div>
}
