import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import type { SimulationPlayback } from '../../hooks/useSimulationPlayback'
import { displayNumber } from '../../utils/formatting'
export function GanttPlayback({ playback, end, eventCount, disabled }: {
  playback: SimulationPlayback; end: number; eventCount: number; disabled: boolean
}) {
  return <div className="gantt-playback" aria-label="Playback controls">
    <div className="playback-buttons">
      <button type="button" className="button secondary small" disabled={disabled || playback.eventIndex < 0} onClick={playback.previous}><SkipBack size={15} /> Previous Step</button>
      <button type="button" className="button primary small" disabled={disabled} onClick={playback.playing ? playback.pause : playback.play}>{playback.playing ? <Pause size={15} /> : <Play size={15} />}{playback.playing ? 'Pause' : 'Play'}</button>
      <button type="button" className="button secondary small" disabled={disabled || playback.eventIndex >= eventCount - 1} onClick={playback.next}>Next Step <SkipForward size={15} /></button>
      <button type="button" className="button secondary small" disabled={disabled} onClick={playback.restart}><RotateCcw size={14} /> Restart</button>
      <label className="playback-speed">Playback Speed<select aria-label="Playback Speed" value={playback.speed} disabled={disabled} onChange={event => playback.setSpeed(Number(event.target.value))}>{[0.5, 1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
    </div>
    <div className="playback-scrubber"><label htmlFor="simulation-time">Simulation time <strong className="mono">{displayNumber(playback.time)} / {end}</strong></label><input id="simulation-time" aria-label="Seek simulation time" type="range" min={0} max={end} step="any" value={playback.time} disabled={disabled} onChange={event => playback.seek(Number(event.target.value))} /></div>
    <p className="field-hint">1× = one CPU time unit per second. Step buttons visit every engine event, including events with the same timestamp. Seeking and playback show the last event at or before the selected time.</p>
  </div>
}
