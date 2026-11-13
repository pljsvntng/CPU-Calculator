import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { schedule } from '../engine/scheduler'
import type { GanttSegment, SchedulingResult } from '../types/scheduling'
import { unitTimeline, unitWindow, UNIT_WINDOW_SIZE } from '../utils/ganttUnits'
import { SchedulingGanttChart } from '../components/gantt/SchedulingGanttChart'
import { buildGanttSvg } from '../utils/ganttExport'
import { ComparisonOverview } from '../components/comparison/ComparisonOverview'

const run = (arrivalTime = 0, burstTime = 4) => schedule([{ id: 'P1', arrivalTime, burstTime, originalInputOrder: 0 }], { algorithm: 'FCFS' })
const cells = (r: SchedulingResult) => { const model = unitTimeline(r); return model.slice(0, model.count) }
const intervals = (r: SchedulingResult) => cells(r).map(s => [s.processId, s.startTime, s.endTime, s.queueLevel])
const fractional = (segments: [number,number][]) => {
  const r=run(), burst=segments.at(-1)![1]
  return { ...r, segments:segments.map(([startTime,endTime]):GanttSegment=>({processId:'P1',startTime,endTime,duration:endTime-startTime,isIdle:false})), processes:[{...r.processes[0],burstTime:burst}], metrics:{...r.metrics,observationEndTime:burst,totalObservedTime:burst} }
}

describe('display-only time-unit segmentation',()=>{
  it('renders the requested four separate P1 blocks and all five boundaries',()=>{
    const result=run(), before=JSON.stringify(result), {container}=render(<SchedulingGanttChart result={result}/>)
    expect([...container.querySelectorAll('[data-gantt-segment]')].map(e=>[e.getAttribute('data-process'),e.getAttribute('data-start'),e.getAttribute('data-end')])).toEqual([['P1','0','1'],['P1','1','2'],['P1','2','3'],['P1','3','4']])
    expect([...container.querySelectorAll('[data-time-marker]')].map(e=>e.getAttribute('data-time-marker'))).toEqual(['0','1','2','3','4'])
    expect(cells(result).map(s=>s.remainingAfter)).toEqual([3,2,1,0])
    expect(JSON.stringify(result)).toBe(before)
    expect(result.segments).toHaveLength(1)
  })
  it('preserves multiple-process ownership, original intervals, results and colors',()=>{
    const result=schedule([3,2,2].map((burstTime,i)=>({id:`P${i+1}`,arrivalTime:0,burstTime,originalInputOrder:i})),{algorithm:'FCFS'})
    const before=structuredClone(result)
    expect(cells(result).map(s=>s.processId)).toEqual(['P1','P1','P1','P2','P2','P3','P3'])
    expect(cells(result).map(s=>s.sourceIndex)).toEqual([0,0,0,1,1,2,2])
    expect(result).toEqual(before)
  })
  it('retains RR quantum order without turning visual subdivisions into new dispatches',()=>{
    const result=schedule([{id:'P1',arrivalTime:0,burstTime:4,originalInputOrder:0},{id:'P2',arrivalTime:0,burstTime:2,originalInputOrder:1}],{algorithm:'RR',quantum:2})
    expect(cells(result).map(s=>s.processId)).toEqual(['P1','P1','P2','P2','P1','P1'])
    expect(result.segments.map(s=>[s.processId,s.startTime,s.endTime])).toEqual([['P1',0,2],['P2',2,4],['P1',4,6]])
    expect(result.events.filter(e=>e.type==='process-selected')).toHaveLength(3)
  })
  it('keeps IDLE units distinct and positive before and between arrivals',()=>{
    expect(intervals(run(2,2))).toEqual([[null,0,1,undefined],[null,1,2,undefined],['P1',2,3,undefined],['P1',3,4,undefined]])
  })
  it('retains exact fractional endpoints and a partial final block',()=>{
    const result=fractional([[0,2.5]])
    expect(cells(result).map(s=>[s.startTime,s.endTime,s.duration,s.remainingAfter])).toEqual([[0,1,1,1.5],[1,2,1,0.5],[2,2.5,0.5,0]])
  })
  it('uses shared whole-clock boundaries for fractional arrivals and preserves dispatch boundaries',()=>{
    const result=fractional([[0,0.3],[0.3,1.2],[1.2,2.5]])
    expect(cells(result).map(s=>[s.startTime,s.endTime,s.duration])).toEqual([[0,0.3,0.3],[0.3,1,0.7],[1,1.2,0.2],[1.2,2,0.8],[2,2.5,0.5]])
    expect(cells(result).at(-1)!.remainingAfter).toBe(0)
    expect(result.segments[1].startTime).toBe(0.3)
  })
  it('does not create a zero-length unit at an exact endpoint',()=>{
    expect(cells(fractional([[0,0],[0,1],[1,2]]))).toHaveLength(2)
    expect(cells(fractional([[0.1,0.3]])).map(s=>s.duration)).toEqual([0.2])
  })
  it('keeps the calculator engine integer-only instead of changing numerical validation',()=>{
    expect(()=>run(0,2.5)).toThrow(/integer/)
  })
  it('preserves queue ownership exactly and never projects a CPU unit into two active queues',()=>{
    const result=schedule([{id:'P1',arrivalTime:0,burstTime:12,originalInputOrder:0},{id:'P2',arrivalTime:8,burstTime:1,originalInputOrder:1}],{algorithm:'MLFQ',levels:[{level:1,policy:{algorithm:'RR',quantum:2}},{level:2,policy:{algorithm:'RR',quantum:4}},{level:3,policy:{algorithm:'FCFS'}}]})
    const before=structuredClone(result), {container}=render(<SchedulingGanttChart result={result}/>)
    for (const cell of cells(result)) {
      fireEvent.change(screen.getByLabelText('Inspect interval'),{target:{value:String(cell.index+1)}})
      const projected=container.querySelectorAll(`[data-queue-interval][data-start="${cell.startTime}"]`)
      expect(projected).toHaveLength(1)
      expect(projected[0]).toHaveAttribute('data-queue-interval',String(cell.queueLevel))
      expect(projected[0]).toHaveAttribute('data-end',String(cell.endTime))
      expect(projected[0].querySelector('rect')!.getAttribute('x')).toBe(container.querySelector(`[data-gantt-segment="${cell.index}"] .segment-block`)!.getAttribute('x'))
    }
    expect(result).toEqual(before)
  })
  it('highlights only the actual time unit at the playhead',()=>{
    const {container}=render(<SchedulingGanttChart result={run()}/>)
    fireEvent.change(screen.getByLabelText('Seek simulation time'),{target:{value:'2.5'}})
    expect([...container.querySelectorAll('.active-segment')].map(e=>e.getAttribute('data-start'))).toEqual(['2'])
  })
  it('indexes a million-unit burst lazily and reaches every unit through bounded windows',()=>{
    const result=run(0,1_000_000), timeline=unitTimeline(result)
    expect(timeline.count).toBe(1_000_000)
    expect(timeline.at(999999)).toMatchObject({startTime:999999,endTime:1000000,duration:1,remainingAfter:0,sourceIndex:0})
    expect(unitWindow(timeline,1)).toEqual({first:UNIT_WINDOW_SIZE,last:2*UNIT_WINDOW_SIZE,startTime:UNIT_WINDOW_SIZE,endTime:2*UNIT_WINDOW_SIZE})
    expect(timeline.at(-1)).toBeUndefined();expect(timeline.at(timeline.count)).toBeUndefined()
    const {container}=render(<SchedulingGanttChart result={result}/>)
    expect(container.querySelectorAll('[data-gantt-segment]').length).toBeLessThan(40)
    fireEvent.change(screen.getByLabelText('Inspect interval'),{target:{value:'1000000'}})
    expect(container.querySelector('[data-gantt-segment="999999"]')).toHaveAttribute('data-start','999999')
    expect(container.querySelectorAll('[data-gantt-segment]').length).toBeLessThan(40)
    expect(screen.getByRole('group',{name:'Timeline time window'})).toHaveTextContent('1,000,000 unit blocks are available')
    fireEvent.click(screen.getByRole('button',{name:'Previous window'}))
    expect(container.querySelector(`[data-gantt-segment="${487*UNIT_WINDOW_SIZE}"]`)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Seek simulation time'),{target:{value:'0'}})
    // Seeking changes windows when playback time changes; unit navigation remains independent.
    act(()=>fireEvent.change(screen.getByLabelText('Seek simulation time'),{target:{value:'1'}}))
    expect(container.querySelector('[data-gantt-segment="1"]')).toBeInTheDocument()
  })
  it('uses the same unit boundaries in comparison overviews and complete SVG exports',()=>{
    const result=run(), xml=buildGanttSvg(result), doc=new DOMParser().parseFromString(xml,'image/svg+xml')
    expect(doc.querySelectorAll('[data-unit-block]')).toHaveLength(4)
    expect([...doc.querySelectorAll('[data-unit-block] title')].map(e=>e.textContent)).toEqual(['P1: 0–1; duration 1','P1: 1–2; duration 1','P1: 2–3; duration 1','P1: 3–4; duration 1'])
    const {container}=render(<ComparisonOverview result={result} domainEnd={4}/>)
    expect(container.querySelectorAll('[data-unit-block]')).toHaveLength(4)
  })
  it('wraps long exports without compressing cells or losing any final unit',()=>{
    const doc=new DOMParser().parseFromString(buildGanttSvg(run(0,600)),'image/svg+xml')
    expect(doc.querySelectorAll('[data-unit-block]')).toHaveLength(600)
    expect(doc.querySelector('[data-unit-block="599"] title')?.textContent).toContain('599–600')
    const widths=[...doc.querySelectorAll('[data-unit-block] > rect:first-of-type')].map(e=>Number(e.getAttribute('width')))
    expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(0.000001)
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(56)
  })
  it('reports export limits explicitly while leaving the complete interactive data accessible',()=>{
    const result=run(0,1000000)
    expect(()=>buildGanttSvg(result)).toThrow('20,000')
    expect(unitTimeline(result).at(999999)?.endTime).toBe(1000000)
  })
})
