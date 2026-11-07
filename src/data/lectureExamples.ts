import type { SchedulingConfig, SchedulingProcess } from '../types/scheduling'
import { MLQ_LECTURE_PRESET, MLQ_LECTURE_SECOND_PRESET, MLFQ_PRESET_1_2, MLFQ_PRESET_2_3 } from './schedulingPresets'

export interface LectureInputExample {
  page: number
  label: string
  config: SchedulingConfig
  processes: SchedulingProcess[]
  note: string
}
// Input-only transcriptions verified from the lecture images during Phase 2.
// Expected outputs stay in independent test fixtures; none are imported by the UI.
const dataset = (second = false, priorities?: number[], queues?: number[]): SchedulingProcess[] => {
  const arrival = second ? [10, 8, 12, 3, 15] : [3, 5, 8, 0, 12]
  const burst = second ? [5, 4, 4, 3, 5] : [4, 9, 4, 7, 6]
  return arrival.map((arrivalTime, i) => ({ id: `P${i + 1}`, originalInputOrder: i, arrivalTime, burstTime: burst[i],
    ...(priorities ? { priority: priorities[i] } : {}), ...(queues ? { queueLevel: queues[i] } : {}),
  }))
}
const priorityA = [2, 1, 2, 1, 1], priorityB = [2, 2, 1, 2, 1]
const entry = (page: number, config: SchedulingConfig, processes: SchedulingProcess[], note = ''): LectureInputExample => ({
  page, config, processes, label: `${config.algorithm} · Example ${[7, 10, 13, 16, 19, 22, 25, 28].includes(page) ? 2 : 1} · page ${page}`, note,
})
export const lectureInputExamples: LectureInputExample[] = [
  entry(6, { algorithm: 'FCFS' }, dataset()), entry(7, { algorithm: 'FCFS' }, dataset(true)),
  entry(9, { algorithm: 'SJF' }, dataset()), entry(10, { algorithm: 'SJF' }, dataset(true)),
  entry(12, { algorithm: 'NPP' }, dataset(false, priorityA)), entry(13, { algorithm: 'NPP' }, dataset(true, priorityB)),
  entry(15, { algorithm: 'SRTF' }, dataset()), entry(16, { algorithm: 'SRTF' }, dataset(true)),
  entry(18, { algorithm: 'PP' }, dataset(false, priorityA)),
  entry(19, { algorithm: 'PP' }, dataset(true, priorityB), 'PDF rechecked in Phase 6: P3 has priority 1. The earlier priority-2 transcription and discrepancy note were incorrect; this input now agrees with the printed table and chart.'),
  entry(21, { algorithm: 'RR', quantum: 3 }, dataset()), entry(22, { algorithm: 'RR', quantum: 2 }, dataset(true)),
  entry(24, MLQ_LECTURE_PRESET, dataset(false, priorityA, [1, 1, 2, 2, 1]), 'Queue 1 uses NPP; queue 2 uses SRTF. Strict interqueue preemption is selected to reproduce this trace.'),
  entry(25, MLQ_LECTURE_SECOND_PRESET, dataset(true, priorityB, [1, 2, 2, 2, 1]), 'This example uses PP/SJF and defers interqueue preemption until the current scheduling boundary.'),
  entry(27, { ...MLFQ_PRESET_2_3, interqueuePreemption: false }, dataset(), 'The lecture lets a running lower-level turn finish. Deferred interqueue preemption is selected explicitly; the regular preset defaults to strict preemption.'),
  entry(28, { ...MLFQ_PRESET_1_2, interqueuePreemption: false }, dataset(true), 'The written level list and actual turns use quanta 1 and 2. The small row labels differ. Deferred interqueue preemption is selected to reproduce the trace.'),
]
