import type { SchedulingResult } from '../types/scheduling'
import { GANTT_HEIGHT, GANTT_Y, ganttScale, visibleTimeLabels } from './ganttScale'
import { unitTimeline, MIN_UNIT_PIXELS } from './ganttUnits'
import { processColor } from './simulationView'

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
export const MAX_EXPORT_UNIT_BLOCKS = 20_000
/** Full unit-grid export. Wrap rows rather than compressing long runs into unreadable blocks. */
export function buildGanttSvg(result: SchedulingResult, requestedWidth = 1200, sharedEnd = result.metrics.observationEndTime) {
  const timeline = unitTimeline(result), end = Math.max(sharedEnd, result.metrics.observationEndTime)
  if (timeline.count > MAX_EXPORT_UNIT_BLOCKS || Math.ceil(end) > MAX_EXPORT_UNIT_BLOCKS) throw new Error('Per-unit SVG/PNG exports support up to 20,000 time-unit blocks. The interactive timeline and unit navigator still provide the complete schedule.')
  const minimumCell = Math.max(MIN_UNIT_PIXELS, String(end).length * 8 + 16, ...result.processes.map(p => p.id.length * 8 + 20))
  const width = Math.max(400, Math.min(16_000, Math.max(requestedWidth, end * minimumCell + 76)))
  const columns = Math.max(1, Math.floor((width - 76) / minimumCell))
  const rows = Math.max(1, Math.ceil(end / columns))
  const strips = Array.from({ length: rows }, (_, row) => {
    const from = row * columns, to = Math.min(end, from + columns)
    const scale = ganttScale(from, from + Math.max(1, Math.min(end, columns)), width)
    const cells = timeline.slice(timeline.indexAtTime(from), timeline.indexAtTime(to) + 1).filter(cell => cell.startTime >= from && cell.startTime < to)
    const boundaries = [...new Set([from, ...cells.flatMap(cell => [cell.startTime, cell.endTime]), to])]
    const labels = visibleTimeLabels(boundaries, scale.x)
    const blocks = cells.map(cell => {
      const x = scale.x(cell.startTime), blockWidth = scale.durationWidth(cell.duration), id = cell.processId ?? 'IDLE'
      return `<g data-unit-block="${cell.index}"${cell.queueLevel === undefined ? '' : ` data-queue-level="${cell.queueLevel}"`}><title>${escape(id)}: ${cell.startTime}–${cell.endTime}; duration ${cell.duration}${cell.queueLevel ? `; queue ${cell.queueLevel}` : ''}</title><rect x="${x}" y="${GANTT_Y}" width="${blockWidth}" height="70" fill="${cell.isIdle ? '#68758a' : processColor(id).value}" stroke="#0b1220" stroke-width="1"/>${blockWidth >= 36 ? `<rect x="${x + blockWidth / 2 - Math.min(33, blockWidth / 2 - 3)}" y="${GANTT_Y + 23}" width="${Math.min(66, blockWidth - 6)}" height="24" rx="3" fill="#f8fafc"/><text x="${x + blockWidth / 2}" y="${GANTT_Y + 39}" text-anchor="middle" fill="#0f172a" font-size="12">${escape(id)}</text>` : ''}</g>`
    }).join('')
    const ticks = boundaries.map(time => `<g><title>Time ${time}</title><line x1="${scale.x(time)}" x2="${scale.x(time)}" y1="${GANTT_Y + 74}" y2="${GANTT_Y + 83}" stroke="#bcc9db"/>${labels.has(time) ? `<text x="${scale.x(time)}" y="${GANTT_Y + 104}" text-anchor="middle" font-size="12">${time}</text>` : ''}</g>`).join('')
    return `<g transform="translate(0 ${row * GANTT_HEIGHT})"><text x="38" y="27" font-size="16" font-weight="bold">CPU EXECUTION TIMELINE · ${result.algorithm}</text><text x="38" y="51" fill="#bcc9db" font-size="12">${from}–${to} CPU units · one block per time unit · row ${row + 1}/${rows}</text>${blocks}${ticks}<text x="38" y="218" fill="#bcc9db" font-size="10">CPU Scheduling Lab · Full schedule · idle = gray</text></g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${GANTT_HEIGHT * rows}" viewBox="0 0 ${width} ${GANTT_HEIGHT * rows}" role="img"><title>${result.algorithm} CPU execution timeline</title><desc>Every execution and idle time unit, split only for visualization. Scheduling results are unchanged. Long timelines wrap into readable rows.</desc><rect width="100%" height="100%" fill="#101827"/><g font-family="monospace" fill="#f8fafc">${strips}</g></svg>`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Rasterize the actual standalone SVG; no external assets or placeholder image. */
export async function ganttPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The chart image could not be rendered.')); image.src = url })
    if (image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error('This per-unit chart exceeds the PNG pixel limit. Export SVG instead for the complete timeline.')
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('PNG export needs browser canvas support. SVG export is also available.')
    context.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The PNG could not be encoded.')), 'image/png'))
  } finally { URL.revokeObjectURL(url) }
}

export async function exportGantt(result: SchedulingResult, type: 'svg' | 'png', width: number) {
  const svg = buildGanttSvg(result, width)
  const blob = type === 'svg' ? new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }) : await ganttPng(svg)
  downloadBlob(blob, `${result.algorithm.toLowerCase()}-cpu-timeline.${type}`)
}
