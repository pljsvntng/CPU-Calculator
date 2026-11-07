import type { SchedulingResult } from '../types/scheduling'
import { jsPDF } from 'jspdf'
import { resultCalculationText } from './resultFormatting'
import { comparisonMetrics } from './comparisonEngine'
export function buildReport(results: SchedulingResult[], generated = new Date()) {
  if (!results.length) throw new Error('Calculate a successful result first.')
  const doc = new jsPDF(), width = 178
  let y = 22
  const line = (text: string, size = 10) => {
    doc.setFontSize(size)
    const lines: string[] = doc.splitTextToSize(text.replaceAll('−', '-').replaceAll('Σ', 'sum').replaceAll('×', 'x').replaceAll('≈', '~').replaceAll('–', '-').replaceAll('·', '/'), width)
    for (const value of lines) { if (y > 276) { doc.addPage(); y = 22 } doc.text(value, 16, y); y += size * 0.5 + 2 }
  }
  line('CPU Scheduling Lab / Mission Report', 18)
  line(`Generated: ${generated.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} Asia/Manila`)
  line('CPU-only model. Observation starts at 0. Context-switch overhead excluded. No context-switch count is reported.')
  if (results.length > 1) {
    line('SCHEDULING PERFORMANCE REPORT', 14)
    for (const [metric, label, unit] of comparisonMetrics) {
      line(`${label} (${unit})`, 12)
      const max = Math.max(...results.map(r => r.metrics[metric]), 1)
      for (const r of results) { if (y > 266) { doc.addPage(); y = 22 } line(`${r.algorithm}: ${r.metrics[metric].toFixed(4)}`); doc.setFillColor(37, 99, 235); doc.rect(16, y, 160 * r.metrics[metric] / max, 3, 'F'); y += 8 }
    }
  }
  for (const r of results) {
    doc.addPage(); y = 22; line(`${r.algorithm} / Inputs and configuration`, 16)
    line(JSON.stringify(r.config, null, 2))
    line('Process | AT | BT | priority | initial queue')
    r.processes.forEach(p => line(`${p.id} | ${p.arrivalTime} | ${p.burstTime} | ${p.priority ?? '-'} | ${p.queueLevel ?? '-'}`))
    line('Gantt chart / exact interval strips', 14)
    // Paginated interval strips retain every process and exact endpoint even for dense timelines.
    for (let i = 0; i < r.segments.length; i += 4) {
      if (y > 250) { doc.addPage(); y = 22 }
      r.segments.slice(i, i + 4).forEach((s, j) => { doc.setDrawColor(100); doc.rect(16 + j * 44, y, 44, 15); doc.setFontSize(8); doc.text(`${s.processId ?? 'IDLE'}${s.queueLevel ? ` Q${s.queueLevel}` : ''}`, 18 + j * 44, y + 6); doc.text(`${s.startTime} - ${s.endTime}`, 18 + j * 44, y + 12) }); y += 22
    }
    line('Complete results and mathematical solutions', 14)
    for (const text of resultCalculationText(r).split('\n')) line(text)
    line('Assumptions: arrival then input-order dispatch ties; equal running priority/remaining-time ties retain the running process. RR admits boundary arrivals before requeue. Queue policies and interruption behavior are defined by the configuration above.')
  }
  return doc
}
export function downloadReport(results: SchedulingResult[]) { buildReport(results).save('cpu-mission-report.pdf') }
