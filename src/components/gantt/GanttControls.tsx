import { ZoomIn, ZoomOut, Scan, Maximize2, Minimize2, Download, RotateCcw } from 'lucide-react'
export function GanttControls({ zoom, fit, expanded, exporting, disabled, onZoom, onReset, onFit, onFullscreen, onExport }: {
  zoom: number; fit: boolean; expanded: boolean; exporting: boolean; disabled: boolean
  onZoom: (factor: number) => void; onReset: () => void; onFit: () => void; onFullscreen: () => void; onExport: (type: 'svg' | 'png') => void
}) {
  return <div className="gantt-controls" aria-label="Chart controls"><div>
    <button className="button secondary small" type="button" aria-label="Zoom Out" disabled={zoom <= 0.25} onClick={() => onZoom(0.5)}><ZoomOut size={15} /></button>
    <output aria-label="Chart zoom" className="mono">{fit ? 'FIT · ' : ''}{zoom * 100}%</output>
    <button className="button secondary small" type="button" aria-label="Zoom In" disabled={zoom >= 16} onClick={() => onZoom(2)}><ZoomIn size={15} /></button>
    <button className="button secondary small" type="button" onClick={onReset}><RotateCcw size={14} /> Reset Zoom</button>
    <button className="button secondary small" type="button" onClick={onFit}><Scan size={15} /> Fit to Screen</button>
    <button className="button secondary small" type="button" onClick={onFullscreen}>{expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{expanded ? 'Exit Fullscreen' : 'Fullscreen View'}</button>
  </div><div><button className="button secondary small" type="button" disabled={disabled || exporting} onClick={() => onExport('svg')}><Download size={14} /> Export SVG</button><button className="button secondary small" type="button" disabled={disabled || exporting} onClick={() => onExport('png')}><Download size={14} />{exporting ? 'Exporting…' : 'Export PNG'}</button></div></div>
}
