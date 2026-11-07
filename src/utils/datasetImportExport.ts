import type { SchedulingRequest } from './calculator'
import { validateSchedulingInput } from './schedulingValidation'
export interface MissionDataset extends SchedulingRequest { version: 1 }
export function parseDataset(raw: string): MissionDataset {
  if (raw.length > 250_000) throw new Error('Dataset exceeds the 250 KB import limit.')
  let data: unknown
  try { data = JSON.parse(raw) } catch { throw new Error('Dataset must contain valid JSON.') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dataset must be an object.')
  const d = data as Record<string, unknown>
  if (d.version !== 1) throw new Error('Unsupported dataset schema version; expected 1.')
  if (Object.keys(d).some(k => !['version', 'processes', 'config'].includes(k))) throw new Error('Unsupported dataset property.')
  validateSchedulingInput(d.processes, d.config)
  const config = d.config as Record<string, unknown>
  if (config.priorityPromotions !== undefined || config.limits !== undefined) throw new Error('Editable imports do not support scheduled promotions or custom engine limits.')
  if ((d.processes as unknown[]).length > 20) throw new Error('The editable workspace supports up to 20 processes.')
  const processes = (d.processes as SchedulingRequest['processes']).map((p, index) => {
    if (p.originalInputOrder !== index) throw new Error('Editable imports require originalInputOrder to equal the zero-based row index.')
    if (!/^P[1-9]\d*$/.test(p.id) || Number(p.id.slice(1)) > 1_000_000) throw new Error('Editable dataset IDs must use P followed by a positive integer, up to P1000000.')
    if (Object.keys(p).some(k => !['id', 'arrivalTime', 'burstTime', 'priority', 'queueLevel', 'originalInputOrder'].includes(k))) throw new Error(`Unsupported process property for ${p.id}.`)
    return { ...p }
  })
  return JSON.parse(JSON.stringify({ version: 1, processes, config: d.config })) as MissionDataset
}
export const datasetJson = (request: SchedulingRequest) => JSON.stringify({ version: 1, processes: request.processes, config: request.config }, null, 2)
