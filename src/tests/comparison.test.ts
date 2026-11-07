import { describe, expect, it } from 'vitest'
import { compareAlgorithms, comparisonInsights, comparisonMetrics, comparisonWinners } from '../utils/comparisonEngine'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { lectureInputExamples } from '../data/lectureExamples'
import { executeSimulation } from '../services/simulationTask'
describe('actual comparison experiments', () => {
  it('runs all eight policies on shared IDs, AT and BT, preserves inputs and matches the engine', async () => {
    const p=generatePracticeProblem({algorithm:'MLQ',difficulty:'easy',seed:'comparison'})
    const processes=p.processes.map(x=>({...x,priority:2})), before=structuredClone(processes)
    const configs=lectureInputExamples.filter((_,i)=>i%2===0).map(e=>({algorithm:e.config.algorithm,json:JSON.stringify({...e.config,...(['NPP','PP','MLQ'].includes(e.config.algorithm)?{priorityDirection:'lower-first'}:{})})}))
    const rows=await compareAlgorithms(processes,configs,new AbortController().signal)
    expect(rows).toHaveLength(8); expect(rows.every(r=>r.result&&!r.error)).toBe(true);expect(processes).toEqual(before)
    for(const row of rows){const r=row.result!;expect(r.processes.map(p=>[p.id,p.arrivalTime,p.burstTime])).toEqual(processes.map(p=>[p.id,p.arrivalTime,p.burstTime]));expect(r).toEqual(executeSimulation({processes:r.processes,config:r.config}))}
    expect(comparisonInsights(rows.map(r=>r.result!))).toHaveLength(6)
  })
  it('reports missing configuration per algorithm without fabricating outputs',async()=>{
    const p=generatePracticeProblem({algorithm:'FCFS',difficulty:'easy'})
    const rows=await compareAlgorithms(p.processes,[{algorithm:'FCFS',json:'{"algorithm":"FCFS"}'},{algorithm:'RR',json:'{"algorithm":"RR"}'}],new AbortController().signal)
    expect(rows[0].result).not.toBeNull();expect(rows[1].result).toBeNull();expect(rows[1].error).toContain('quantum')
  })
  it('handles every optimization goal and exact workload ties',()=>{
    const p=generatePracticeProblem({algorithm:'FCFS',difficulty:'easy'}),r=executeSimulation(p),second={...r,algorithm:'SJF' as const}
    for(const [metric]of comparisonMetrics)expect(comparisonWinners([r,second],metric)).toEqual(['FCFS','SJF'])
    expect(comparisonWinners([], 'averageWaitingTime')).toEqual([])
  })
  it('requires two policies and honors cancellation',async()=>{
    const p=generatePracticeProblem({algorithm:'FCFS',difficulty:'easy'})
    await expect(compareAlgorithms(p.processes,[],new AbortController().signal)).rejects.toThrow('two')
    const c=new AbortController();c.abort();await expect(compareAlgorithms(p.processes,[{algorithm:'FCFS',json:'{}'},{algorithm:'SJF',json:'{}'}],c.signal)).rejects.toThrow('cancelled')
  })
})
