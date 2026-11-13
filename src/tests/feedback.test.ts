import { describe, expect, it } from 'vitest'
import { schedule, SchedulingValidationError } from '../engine/scheduler'
import type { FeedbackLevel, QueueAlgorithm, SchedulingConfig, SchedulingProcess, SchedulingResult } from '../types/scheduling'
import { createCalculatorDraft, draftFromRequest, prepareRequest } from '../utils/calculator'
import { calculateMetrics } from '../utils/metrics'
import { parseDataset, datasetJson } from '../utils/datasetImportExport'

const input = (arrivals: number[], bursts: number[], priorities = arrivals.map((_, i) => i)) => arrivals.map((arrivalTime, i): SchedulingProcess => ({ id: `P${i + 1}`, arrivalTime, burstTime: bursts[i], originalInputOrder: i, priority: priorities[i] }))
const defaultLevels: FeedbackLevel[] = [{ level: 1, policy: { algorithm: 'RR', quantum: 2 } }, { level: 2, policy: { algorithm: 'RR', quantum: 4 } }, { level: 3, policy: { algorithm: 'FCFS' } }]
const config = (levels = defaultLevels): Extract<SchedulingConfig, { algorithm: 'MLFQ' }> => ({ algorithm: 'MLFQ', levels })
const trace = (r: SchedulingResult) => r.segments.map(s => [s.processId, s.startTime, s.endTime, s.queueLevel])
function verify(r: SchedulingResult) {
  let end = 0, busy = 0
  for (const s of r.segments) {
    expect(s.startTime).toBe(end)
    expect(s.duration).toBeGreaterThan(0)
    expect(s.endTime - s.startTime).toBe(s.duration)
    if (!s.isIdle) { busy += s.duration; expect(s.startTime).toBeGreaterThanOrEqual(r.processes.find(p => p.id === s.processId)!.arrivalTime) }
    end = s.endTime
  }
  for (const p of r.processes) {
    const history = r.segments.filter(s => s.processId === p.id)
    expect(history.reduce((n, s) => n + s.duration, 0)).toBe(p.burstTime)
    expect(p.executionHistory).toEqual(history)
    expect(p.completionTime).toBe(history.at(-1)!.endTime)
    expect(p.turnaroundTime).toBe(p.completionTime - p.arrivalTime)
    expect(p.waitingTime).toBe(p.turnaroundTime - p.burstTime)
    expect(p.responseTime).toBe(history[0].startTime - p.arrivalTime)
    expect(p.waitingTime).toBeGreaterThanOrEqual(0)
  }
  expect(r.metrics.cpuUtilization).toBe(busy / end * 100)
  expect(r.metrics.throughput).toBe(r.processes.length / end)
  const average = (key: 'waitingTime' | 'turnaroundTime' | 'responseTime') => r.processes.reduce((n,p) => n+p[key],0)/r.processes.length
  expect(r.metrics.averageWaitingTime).toBe(average('waitingTime'))
  expect(r.metrics.averageTurnaroundTime).toBe(average('turnaroundTime'))
  expect(r.metrics.averageResponseTime).toBe(average('responseTime'))
}

describe('configurable feedback scheduling', () => {
  it('uses RR2/RR4/FCFS by default and finishes short jobs without demotion', () => {
    const draft = createCalculatorDraft()
    expect(draft.mlfqLevels.map(q => [q.policy,q.policy === 'RR' ? q.quantum : null])).toEqual([['RR','2'],['RR','4'],['FCFS',null]])
    const r = schedule(input([0,0],[9,1]), config())
    expect(trace(r)).toEqual([['P1',0,2,1],['P2',2,3,1],['P1',3,7,2],['P1',7,10,3]])
    expect(r.events.filter(e => e.type === 'process-demoted').map(e=>e.processId)).toEqual(['P1','P1'])
    verify(r)
  })
  it('preserves interrupted RR quantum and global metrics including initial idle', () => {
    const r = schedule(input([2,5],[10,1]),config())
    expect(trace(r)).toEqual([[null,0,2,undefined],['P1',2,4,1],['P1',4,5,2],['P2',5,6,1],['P1',6,9,2],['P1',9,13,3]])
    expect(r.processes.map(p=>[p.completionTime,p.turnaroundTime,p.waitingTime,p.responseTime])).toEqual([[13,11,1,0],[6,1,0,0]])
    verify(r)
  })
  it.each(['FCFS','SJF','SRTF','NPP','PP'] as const)('uses explicit service budgets with %s at Q1', algorithm => {
    const r = schedule(input([0],[12]),config([{ level:1,policy:{algorithm},demotion:{kind:'service',budget:3}},defaultLevels[1],defaultLevels[2]]))
    expect(trace(r)).toEqual([['P1',0,3,1],['P1',3,7,2],['P1',7,12,3]])
    expect(r.events.find(e=>e.type==='cpu-budget-exhausted')?.timestamp).toBe(3)
    verify(r)
  })
  it('retains accumulated CPU service budget through multiple same-queue preemptions', () => {
    const r = schedule(input([0,1,3],[10,1,1]),config([{level:1,policy:{algorithm:'SRTF'},demotion:{kind:'service',budget:3}},defaultLevels[1],defaultLevels[2]]))
    expect(r.segments.filter(s=>s.processId==='P1' && s.queueLevel===1).reduce((n,s)=>n+s.duration,0)).toBe(3)
    expect(r.events.find(e=>e.type==='process-demoted' && e.processId==='P1')?.timestamp).toBe(5)
    verify(r)
  })
  it('keeps RR quantum independent of a longer cumulative CPU service budget', () => {
    const r = schedule(input([0,0],[9,1]),config([{level:1,policy:{algorithm:'RR',quantum:2},demotion:{kind:'service',budget:5}},defaultLevels[1],defaultLevels[2]]))
    expect(r.segments.filter(s=>s.processId==='P1' && s.queueLevel===1).map(s=>s.duration)).toEqual([2,2,1])
    expect(r.events.find(e=>e.type==='process-demoted')?.timestamp).toBe(6)
    verify(r)
  })
  it('demotes after N completed RR dispatches, not N CPU units', () => {
    const r = schedule(input([0],[10]),config([{level:1,policy:{algorithm:'RR',quantum:2},demotion:{kind:'dispatches',count:2}},defaultLevels[1],defaultLevels[2]]))
    expect(trace(r)).toEqual([['P1',0,2,1],['P1',2,4,1],['P1',4,8,2],['P1',8,10,3]])
    verify(r)
  })
  it('applies dispatch demotion after a preemptive policy turn ends', () => {
    const r = schedule(input([0,1],[6,1],[4,0]),config([{level:1,policy:{algorithm:'PP'},demotion:{kind:'dispatches',count:1}},defaultLevels[1],defaultLevels[2]]))
    expect(trace(r)).toEqual([['P1',0,1,1],['P2',1,2,1],['P1',2,6,2],['P1',6,7,3]])
    expect(r.events.find(e=>e.type==='process-demoted')?.timestamp).toBe(1)
    verify(r)
  })
  it('does not invent dispatch boundaries for non-preemptive FCFS', () => {
    const r=schedule(input([0,1],[6,1]),config([{level:1,policy:{algorithm:'FCFS'},demotion:{kind:'dispatches',count:1}},...defaultLevels.slice(1)]))
    expect(r.events.some(e=>e.type==='process-demoted')).toBe(false)
    expect(trace(r)).toEqual([['P1',0,6,1],['P2',6,7,1]])
  })
  it('can rotate RR without demotion and run non-RR queues to completion', () => {
    const r=schedule(input([0,0],[5,1]),config([{level:1,policy:{algorithm:'RR',quantum:2},demotion:{kind:'none'}},...defaultLevels.slice(1)]))
    expect(r.segments.every(s=>s.queueLevel===1)).toBe(true)
    expect(r.segments.map(s=>s.duration)).toEqual([2,1,2,1])
    const nonRR=schedule(input([0],[12]),config([{level:1,policy:{algorithm:'SJF'}},...defaultLevels.slice(1)]))
    expect(trace(nonRR)).toEqual([['P1',0,12,1]])
  })
  it('finishing exactly at a budget boundary never demotes the completed job', () => {
    const r=schedule(input([0,0],[2,3]),config([{level:1,policy:{algorithm:'SJF'},demotion:{kind:'service',budget:2}},...defaultLevels.slice(1)]))
    expect(r.events.filter(e=>e.type==='process-demoted').map(e=>e.processId)).toEqual(['P2'])
    verify(r)
  })
  it('respects both priority conventions and deterministic equal-priority arrival ties', () => {
    for (const algorithm of ['NPP','PP'] as const) {
      const levels:FeedbackLevel[]=[{level:1,policy:{algorithm}},...defaultLevels.slice(1)]
      expect(schedule(input([0,0,0],[1,1,1],[2,1,1]),config(levels)).segments.map(s=>s.processId)).toEqual(['P2','P3','P1'])
      expect(schedule(input([0,0,0],[1,1,1],[2,1,1]),{...config(levels),priorityDirection:'higher-first'}).segments.map(s=>s.processId)).toEqual(['P1','P2','P3'])
    }
  })
  it('uses queue-entry time for feedback FCFS rather than original arrival time', () => {
    const jobs=input([0,1],[8,2]); jobs[0]={...jobs[0],queueLevel:1}; jobs[1]={...jobs[1],queueLevel:2}
    const r=schedule(jobs,config([{level:1,policy:{algorithm:'RR',quantum:2}}, {level:2,policy:{algorithm:'FCFS'}},defaultLevels[2]]))
    expect(trace(r)).toEqual([['P1',0,2,1],['P2',2,4,2],['P1',4,10,2]])
  })
  it('preempts bottom-level FCFS and retains remaining work', () => {
    const r=schedule(input([0,8],[12,1]),config())
    expect(trace(r)).toEqual([['P1',0,2,1],['P1',2,6,2],['P1',6,8,3],['P2',8,9,1],['P1',9,13,3]])
    verify(r)
  })
  it('ages and boosts waiting jobs consistently, resetting CPU service budgets', () => {
    const jobs=input([0,0,1,2,3,4,5,6],[6,8,1,1,1,1,1,1]); jobs[0]={...jobs[0],queueLevel:3}
    for(const options of [{agingInterval:2},{boostInterval:3},{agingInterval:2,boostInterval:5}]) {
      const r=schedule(jobs,{...config([{level:1,policy:{algorithm:'SRTF'},demotion:{kind:'service',budget:2}},...defaultLevels.slice(1)]),...options})
      expect(r.events.some(e=>e.type==='process-promoted' && e.processId==='P1')).toBe(true)
      verify(r)
    }
  })
  it('handles long bursts without ticking through every unit',()=>{
    const r=schedule(input([1000],[1_000_000]),config())
    expect(r.segments).toHaveLength(4)
    expect(r.processes[0].completionTime).toBe(1_001_000)
    verify(r)
  })
  const algorithms:QueueAlgorithm[]=['FCFS','SJF','SRTF','NPP','PP','RR']
  it.each(algorithms)('conserves CPU and metrics with %s combined with all 36 middle/bottom policy pairs', first=>{
    for (const second of algorithms) for(const third of algorithms) {
      const levels:FeedbackLevel[]=[first,second,third].map((algorithm,i)=>({level:i+1, policy:algorithm==='RR'?{algorithm,quantum:i+2}:{algorithm}, demotion:i<2?{kind:'service',budget:i+2}:{kind:'none'}}))
      verify(schedule(input([0,0,2,5,13],[14,7,2,8,3],[3,2,0,1,2]),config(levels)))
    }
  })
  it.each([
    {kind:'service',budget:0}, {kind:'service',budget:1.5}, {kind:'dispatches',count:0}, {kind:'none',budget:3}, {kind:'quantum'}, {kind:'unknown'},
  ])('rejects invalid non-RR demotion %j at the runtime boundary',demotion=>{
    expect(()=>schedule(input([0],[5]),config([{level:1,policy:{algorithm:'FCFS'},demotion} as FeedbackLevel,...defaultLevels.slice(1)]))).toThrow(SchedulingValidationError)
  })
  it('requires priority data for jobs that may later reach a priority queue',()=>{
    const jobs=input([0],[5]).map(({priority: _priority,...p})=>p)
    expect(()=>schedule(jobs,config([defaultLevels[0],{level:2,policy:{algorithm:'PP'}},defaultLevels[2]]))).toThrow(/priority/)
  })
  it('round-trips every feedback setting through editable JSON and form configuration',()=>{
    const request={processes:input([0],[9]),config:{...config([{level:1,policy:{algorithm:'PP'},demotion:{kind:'service',budget:3}},{level:2,policy:{algorithm:'RR',quantum:4},demotion:{kind:'dispatches',count:2}},defaultLevels[2]]), priorityDirection:'higher-first' as const}}
    const loaded=parseDataset(datasetJson(request)); const restored=prepareRequest(draftFromRequest(loaded))
    expect(restored.errors).toEqual({})
    expect(schedule(restored.request!.processes,restored.request!.config).segments).toEqual(schedule(request.processes,request.config).segments)
    expect(restored.request!.config).toMatchObject(request.config)
  })
  it('rejects empty/invalid simulations and safely derives zero metrics for empty display data',()=>{
    expect(()=>schedule([],config())).toThrow(SchedulingValidationError)
    expect(()=>schedule(input([-1],[1]),config())).toThrow(SchedulingValidationError)
    expect(()=>schedule(input([0],[0]),config())).toThrow(SchedulingValidationError)
    expect(calculateMetrics([],[])).toMatchObject({averageTurnaroundTime:0,averageWaitingTime:0,averageResponseTime:0,cpuUtilization:0,throughput:0,totalObservedTime:0})
  })
})
