import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
export function CopyResultButton({ text, label, disabled = false }: { text: string; label: string; disabled?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  return <div className="result-copy"><button type="button" className="button secondary small" disabled={disabled} onClick={async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text); setStatus('copied')
    } catch { setStatus('manual') }
  }}>{status === 'copied' ? <Check size={14} /> : <Copy size={14} />}{label}</button>
    {status === 'copied' && <span role="status" aria-label={`${label} status`}>Copied to clipboard.</span>}
    {status === 'manual' && <div className="manual-copy"><p role="status">Clipboard access is unavailable. Select and copy the text below.</p><textarea aria-label={`${label} manually`} readOnly value={text} onFocus={event => event.currentTarget.select()} /></div>}
  </div>
}
