import { datasetJson, parseDataset, type MissionDataset } from './datasetImportExport'
import { newPracticeSeed } from './practiceGenerator'
export const MISSIONS_KEY = 'cpu-scheduling-lab.missions.v1'
export interface SavedMission { version: 1; id: string; name: string; created: string; notes: string; dataset: MissionDataset }
export function readMissions(storage?: Pick<Storage, 'getItem'>): { missions: SavedMission[]; warning: string } {
  try {
    const raw = (storage ?? localStorage).getItem(MISSIONS_KEY)
    if (raw === null) return { missions: [], warning: '' }
    if (raw.length > 2_000_000) throw new Error('Archive is too large.')
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list) || list.length > 100) throw new Error('Invalid archive.')
    const ids = new Set<string>()
    const missions = list.map(m => {
      if (!m || m.version !== 1 || typeof m.id !== 'string' || !m.id || m.id.length > 100 || ids.has(m.id) || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 100 || typeof m.notes !== 'string' || m.notes.length > 2000 || typeof m.created !== 'string' || !Number.isFinite(Date.parse(m.created))) throw new Error('Invalid saved mission.')
      ids.add(m.id)
      return { version: 1 as const, id: m.id, name: m.name, notes: m.notes, created: m.created, dataset: parseDataset(JSON.stringify(m.dataset)) }
    })
    return { missions, warning: '' }
  } catch { return { missions: [], warning: 'Archive storage is unavailable or corrupted. Existing data has not been overwritten. Export a backup or explicitly clear the archive before replacing corrupted data.' } }
}
export function writeMissions(missions: SavedMission[], storage?: Pick<Storage, 'setItem'>) {
  if (missions.length > 100) throw new Error('Archive limit: 100 missions.')
  const raw = JSON.stringify(missions)
  const validation = readMissions({ getItem: () => raw })
  if (validation.warning) throw new Error('Invalid archive data.')
  try { (storage ?? localStorage).setItem(MISSIONS_KEY, raw) } catch { throw new Error('Could not save: browser storage is blocked or its quota is full. Existing archive remains unchanged.') }
}
export function newMission(dataset: MissionDataset, name: string, notes = ''): SavedMission {
  if (!name.trim() || name.trim().length > 100 || notes.length > 2000) throw new Error('Use a name of 1–100 characters and notes up to 2000 characters.')
  return { version: 1, id: newPracticeSeed(), name: name.trim(), notes, created: new Date().toISOString(), dataset: parseDataset(datasetJson(dataset)) }
}
