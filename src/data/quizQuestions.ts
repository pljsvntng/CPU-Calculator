import type { AlgorithmId } from '../types'
import type { SchedulingResult } from '../types/scheduling'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { executeSimulation } from '../services/simulationTask'
import { parseStudentNumber } from '../utils/answerChecker'
import { algorithms } from './algorithms'
interface QuizConcept { text: string; options: { value: string; label: string }[]; correct: string; explanation: string; type: string }
const choices = (values: string[]) => values.map(value => ({ value, label: value }))
const concepts: Record<AlgorithmId, QuizConcept> = {
  FCFS: { type: 'Multiple choice', text: 'Which ready process does FCFS select?', options: choices(['Earliest arrival', 'Shortest burst', 'Highest priority']), correct: 'Earliest arrival', explanation: 'FCFS follows arrival order among ready processes; a selected turn runs to completion.' },
  SJF: { type: 'True or false', text: 'A newly arrived shorter job interrupts a running SJF process.', options: choices(['True', 'False']), correct: 'False', explanation: 'SJF is non-preemptive. SRTF is the corresponding remaining-time preemptive policy.' },
  NPP: { type: 'Identify a scheduling rule', text: 'With lower numbers defined as higher priority, which ready priority ranks first under NPP?', options: choices(['1', '3', '5']), correct: '1', explanation: 'The stated lower-first convention ranks 1 above 3 and 5. Once selected, an NPP turn is non-preemptive.' },
  SRTF: { type: 'Identify the algorithm', text: 'Which policy can interrupt a running process when a strictly shorter remaining burst becomes ready?', options: choices(['FCFS', 'SJF', 'SRTF']), correct: 'SRTF', explanation: 'SRTF compares remaining CPU work. Its strictly-better tie convention is an explicit lab clarification.' },
  PP: { type: 'True or false', text: 'Under this lab’s documented PP tie rule, an equal-priority arrival must preempt.', options: choices(['True', 'False']), correct: 'False', explanation: 'A strictly better priority can preempt. Equal priorities retain the running process; this tie convention is a supplemental engine assumption.' },
  RR: { type: 'Multiple choice', text: 'What happens when an RR quantum expires and CPU work remains?', options: choices(['Requeue at the tail', 'Mark the process complete', 'Reset its original burst']), correct: 'Requeue at the tail', explanation: 'Unfinished work returns to the ready tail. Remaining work is preserved; same-time arrivals enter before requeueing in this lab.' },
  MLQ: { type: 'Identify a scheduling rule', text: 'Which property distinguishes MLQ from feedback scheduling?', options: choices(['Fixed queue membership', 'Automatic demotion after every turn', 'A single mandatory RR policy']), correct: 'Fixed queue membership', explanation: 'MLQ assigns processes to fixed queues. Within-queue policies and interqueue service must still be specified.' },
  MLFQ: { type: 'Multiple choice', text: 'What can happen to an unfinished process after it uses a full RR budget in a non-final feedback level?', options: choices(['Move to a lower level', 'Lose all executed work', 'Be marked complete']), correct: 'Move to a lower level', explanation: 'The lab demotes it one level after full quantum consumption. Precise demotion and promotion rules are explicit configuration assumptions.' },
}
export const quizQuestions = algorithms.flatMap(algorithm => [{ id: `${algorithm.id}:concept`, algorithm: algorithm.id, variant: 'concept' as const }, { id: `${algorithm.id}:calculation`, algorithm: algorithm.id, variant: 'calculation' as const }])
export interface QuizQuestion { id: string; algorithm: AlgorithmId; type: string; text: string; options?: { value: string; label: string }[]; answer: { kind: 'choice'; value: string } | { kind: 'number'; value: number }; explanation: string; source: string; result?: SchedulingResult; showTimeline?: boolean }
export function createQuizQuestion(id: string): QuizQuestion {
  const definition = quizQuestions.find(question => question.id === id)
  if (!definition) throw new Error('Unknown quiz question.')
  const algorithm = definition.algorithm
  if (definition.variant === 'concept') { const concept = concepts[algorithm]; return { ...concept, id, algorithm, answer: { kind: 'choice', value: concept.correct }, source: `Lecture 5, pages ${algorithms.find(a => a.id === algorithm)!.pages}; tie and feedback conventions are explicitly labeled supplemental lab rules.` } }
  const problem = generatePracticeProblem({ algorithm, difficulty: ['SRTF', 'PP', 'MLFQ'].includes(algorithm) ? 'hard' : 'medium', seed: `academy-quiz-${algorithm}` }), result = executeSimulation(problem)
  const process = result.processes[1]
  const base = { id, algorithm, result, source: `Supplemental instructional example · seed ${problem.seed}. Answers are computed by the verified engine.` }
  if (algorithm === 'SJF' || algorithm === 'PP' || algorithm === 'MLQ') {
    const selected = result.events.find(event => event.type === 'process-selected')!
    return { ...base, type: 'Identify the next process', text: `At the first dispatch (time ${selected.timestamp}), which process is selected?`, options: choices(result.processes.map(p => p.id)), answer: { kind: 'choice', value: selected.processId! }, explanation: selected.explanation }
  }
  if (algorithm === 'SRTF') {
    const segment = result.segments.filter(segment => !segment.isIdle)[1]
    return { ...base, showTimeline: true, type: 'Interpret a Gantt chart', text: `Which process executes immediately after time ${segment.startTime} in this verified timeline?`, options: choices(result.processes.map(p => p.id)), answer: { kind: 'choice', value: segment.processId! }, explanation: `The actual interval ${segment.startTime}–${segment.endTime} belongs to ${segment.processId}.` }
  }
  if (algorithm === 'MLFQ') {
    const segment = result.segments.find(segment => (segment.queueLevel ?? 1) > 1)!
    return { ...base, showTimeline: true, type: 'Interpret a Gantt chart', text: `At time ${segment.startTime}, ${segment.processId} begins an interval in which queue level?`, answer: { kind: 'number', value: segment.queueLevel! }, explanation: `The recorded interval ${segment.startTime}–${segment.endTime} has queue level ${segment.queueLevel}. Inspect its tooltip to confirm.` }
  }
  const turnaround = algorithm === 'NPP'
  return { ...base, type: turnaround ? 'Calculate turnaround time' : 'Calculate waiting time', text: `Calculate ${process.id}'s ${turnaround ? 'turnaround time (TT)' : 'waiting time (WT)'}.`, answer: { kind: 'number', value: turnaround ? process.turnaroundTime : process.waitingTime }, explanation: turnaround ? `TT = ET − AT = ${process.completionTime} − ${process.arrivalTime} = ${process.turnaroundTime}.` : `WT = TT − BT = ${process.turnaroundTime} − ${process.burstTime} = ${process.waitingTime}.` }
}
export function gradeQuizAnswer(question: QuizQuestion, raw: string) {
  if (question.answer.kind === 'choice') return { correct: raw === question.answer.value, status: !raw ? 'missing' : raw === question.answer.value ? 'correct' : 'incorrect', expected: question.answer.value }
  const parsed = parseStudentNumber(raw, true), correct = parsed.status === 'valid' && parsed.value === question.answer.value
  return { correct, status: parsed.status !== 'valid' ? parsed.status : correct ? 'correct' : 'incorrect', expected: String(question.answer.value) }
}
