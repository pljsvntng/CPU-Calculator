import type { Algorithm } from '../types'

// Lecture-5.pdf, CPU Scheduling Algorithm, pages 3–28.
// Conceptual descriptions only; no scheduling implementations.
export const algorithms: Algorithm[] = [
  {
    id: 'FCFS', name: 'First Come, First Served', group: 'non-preemptive',
    summary: 'Execute processes in arrival order.',
    description: 'The earliest process in the ready queue receives the CPU first. Once running, it keeps the CPU until its CPU burst completes.',
    principle: 'Arrival order',
    consideration: 'A long CPU burst can delay every process behind it. This is commonly called the convoy effect.',
    pages: '5–7',
  },
  {
    id: 'SJF', name: 'Shortest Job First', group: 'non-preemptive',
    summary: 'Choose the shortest available CPU burst.',
    description: 'When the CPU becomes available, select the ready process with the shortest CPU burst. A newly arriving shorter job does not interrupt the running process.',
    principle: 'Shortest available burst',
    consideration: 'Burst lengths must be known or estimated. Long jobs can wait while shorter jobs continue to arrive.',
    pages: '8–10',
  },
  {
    id: 'NPP', name: 'Non-Preemptive Priority', group: 'non-preemptive',
    summary: 'Run the highest-priority ready process.',
    description: 'Select the highest-priority process in the ready queue. It runs until its CPU burst finishes, even if a higher-priority process arrives.',
    principle: 'Priority, without interruption',
    consideration: 'The priority-number convention must be stated before solving a problem. Low-priority jobs may wait for long periods.',
    pages: '11–13', needsPriority: true,
  },
  {
    id: 'SRTF', name: 'Shortest Remaining Time First', group: 'preemptive',
    summary: 'Prioritize the least remaining CPU time.',
    description: 'Compare the remaining CPU time of the running process with ready processes. A newly available process with less remaining time can preempt the running one.',
    principle: 'Shortest remaining burst',
    consideration: 'Arrivals can change the running process. A complete solution must track remaining time after each interruption.',
    pages: '14–16',
  },
  {
    id: 'PP', name: 'Preemptive Priority', group: 'preemptive',
    summary: 'Allow higher-priority processes to interrupt.',
    description: 'The highest-priority available process receives the CPU. A higher-priority arrival can interrupt the process that is currently running.',
    principle: 'Priority, with interruption',
    consideration: 'Priority ordering and equal-priority tie rules must be explicit. Low-priority processes can experience starvation.',
    pages: '17–19', needsPriority: true,
  },
  {
    id: 'RR', name: 'Round Robin', group: 'preemptive',
    summary: 'Share CPU time using a fixed time quantum.',
    description: 'Each ready process receives a turn of up to one time quantum. An unfinished process returns to the ready queue after its turn.',
    principle: 'Cyclic turns, bounded by a quantum',
    consideration: 'The time quantum affects responsiveness and the frequency of context switches.',
    pages: '20–22', needsQuantum: true,
  },
  {
    id: 'MLQ', name: 'Multilevel Queue', group: 'preemptive',
    summary: 'Assign processes to fixed scheduling queues.',
    description: 'Processes are permanently assigned to separate queues. Each queue has a scheduling policy, with an additional policy deciding how CPU time is shared between queues.',
    principle: 'Fixed queue membership',
    consideration: 'Queue policies and scheduling between queues must be defined. The lecture groups MLQ with preemptive algorithms; behavior depends on those policies.',
    pages: '23–25',
  },
  {
    id: 'MLFQ', name: 'Multilevel Feedback Queue', group: 'preemptive',
    summary: 'Let processes move between scheduling queues.',
    description: 'Processes can move between queues according to CPU usage and waiting time. The policy adapts to processes with different CPU-burst characteristics.',
    principle: 'Dynamic queue membership',
    consideration: 'Queue levels, time quanta, promotion, and demotion rules are essential parts of a complete problem definition.',
    pages: '26–28',
  },
]

export const learningObjectives = [
  { title: 'Identify the algorithms', description: 'Recognize the eight CPU scheduling algorithms and explain how each chooses the next process.' },
  { title: 'Evaluate a scheduling scenario', description: 'Work toward computing and comparing algorithms to determine which is most efficient for a given scenario.' },
]
