import type { SchedulingResult } from '../types/scheduling'
import { GANTT_HEIGHT, GANTT_Y, ganttScale, visibleTimeLabels } from './ganttScale'
import { processColor } from './simulationView'

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
export function buildGanttSvg(result: SchedulingResult, requestedWidth = 1200, sharedEnd = result.metrics.observationEndTime) {
  const width = Math.max(400, Math.min(16_000, requestedWidth))
  const scale = ganttScale(result.metrics.observationStartTime, Math.max(sharedEnd, result.metrics.observationEndTime), width)
  const boundaries = [...new Set(result.segments.flatMap(segment => [segment.startTime, segment.endTime]))]
  const labels = visibleTimeLabels(boundaries, scale.x)
  const blocks = result.segments.map(segment => {
    const x = scale.x(segment.startTime), blockWidth = scale.durationWidth(segment.duration)
    const id = segment.processId ?? 'IDLE'
    return `<g><title>${escape(id)}: ${segment.startTime}–${segment.endTime}; duration ${segment.duration}${segment.queueLevel ? `; queue ${segment.queueLevel}` : ''}</title><rect x="${x}" y="${GANTT_Y}" width="${blockWidth}" height="70" fill="${segment.isIdle ? '#68758a' : processColor(id).value}" stroke="#0b1220" stroke-width="1"/>${blockWidth >= 36 ? `<rect x="${x + blockWidth / 2 - Math.min(33, blockWidth / 2 - 3)}" y="${GANTT_Y + 23}" width="${Math.min(66, blockWidth - 6)}" height="24" rx="3" fill="#f8fafc"/><text x="${x + blockWidth / 2}" y="${GANTT_Y + 39}" text-anchor="middle" fill="#0f172a" font-size="12">${escape(id)}</text>` : ''}</g>`
  }).join('')
  const ticks = boundaries.map(time => `<g><title>Time ${time}</title><line x1="${scale.x(time)}" x2="${scale.x(time)}" y1="${GANTT_Y + 74}" y2="${GANTT_Y + 83}" stroke="#bcc9db"/>${labels.has(time) ? `<text x="${scale.x(time)}" y="${GANTT_Y + 104}" text-anchor="middle" font-size="12">${time}</text>` : ''}</g>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${GANTT_HEIGHT}" viewBox="0 0 ${width} ${GANTT_HEIGHT}" role="img"><title>${result.algorithm} CPU execution timeline</title><desc>Every interval from the verified engine. Observation begins at 0. Compressed intervals retain their process and timestamp in SVG titles.</desc><rect width="100%" height="100%" fill="#101827"/><g font-family="monospace" fill="#f8fafc"><text x="38" y="27" font-size="16" font-weight="bold">CPU EXECUTION TIMELINE · ${result.algorithm}</text><text x="38" y="51" fill="#bcc9db" font-size="12">0–${result.metrics.observationEndTime} CPU units · ${result.segments.length} intervals · ${result.processes.length} processes</text>${blocks}${ticks}<text x="38" y="218" fill="#bcc9db" font-size="10">CPU Scheduling Lab · Full schedule · proportional time scale · idle = gray</text></g></svg>`
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
