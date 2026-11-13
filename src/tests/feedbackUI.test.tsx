import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { QueueTimelines } from '../components/gantt/QueueTimelines'
import { schedule } from '../engine/scheduler'
import { unitTimeline } from '../utils/ganttUnits'
import App from '../App'

it('projects every busy interval into exactly one aligned queue view with tap and keyboard inspection', async () => {
  const result=schedule([{id:'P1',arrivalTime:2,burstTime:12,originalInputOrder:0},{id:'P2',arrivalTime:9,burstTime:1,originalInputOrder:1}],{algorithm:'MLFQ',levels:[{level:1,policy:{algorithm:'RR',quantum:2}},{level:2,policy:{algorithm:'RR',quantum:4}},{level:3,policy:{algorithm:'FCFS'}}]})
  const inspect=vi.fn(), user=userEvent.setup()
  const units=unitTimeline(result).slice(0,unitTimeline(result).count)
  const {container}=render(<QueueTimelines result={result} visible={units} width={800} x={time=>38+time*32} times={[...new Set(result.segments.flatMap(s=>[s.startTime,s.endTime]))]} scrollLeft={0} available={390} time={9} selected={0} onInspect={inspect} />)
  expect(container.querySelectorAll('.queue-timeline')).toHaveLength(3)
  const rendered=[...container.querySelectorAll('[data-queue-interval]')].map(e=>({processId:e.getAttribute('data-process'),startTime:Number(e.getAttribute('data-start')),endTime:Number(e.getAttribute('data-end')),queueLevel:Number(e.getAttribute('data-queue-interval'))})).sort((a,b)=>a.startTime-b.startTime)
  expect(rendered).toEqual(units.filter(s=>!s.isIdle).map(({processId,startTime,endTime,queueLevel})=>({processId,startTime,endTime,queueLevel})))
  for(const row of container.querySelectorAll('.queue-timeline')) {
    const blocks=[...row.querySelectorAll('g[data-start]')]
    expect(blocks.map(e=>Number(e.querySelector('rect')!.getAttribute('x')))).toEqual(units.map(s=>38+s.startTime*32))
    expect(row.textContent).toContain('IDLE')
  }
  const block=screen.getByRole('button',{name:'P1 · Q2: 4–5, duration 1'})
  await user.click(block); expect(inspect).toHaveBeenCalledWith(4)
  block.focus();await user.keyboard('{Enter}');expect(inspect).toHaveBeenCalledTimes(2)
})
it('supports all policies and explicit budgets in calculator queues, preserves inputs, and recovers reset data',async()=>{
  const user=userEvent.setup()
  render(<MemoryRouter initialEntries={['/calculator?algorithm=MLFQ']}><App /></MemoryRouter>)
  for(const level of [1,2,3]) expect(within(screen.getByLabelText(`Queue ${level} scheduling policy`)).getAllByRole('option').map(e=>(e as HTMLOptionElement).value)).toEqual(['FCFS','SJF','NPP','SRTF','PP','RR'])
  await user.click(screen.getByRole('button',{name:'LOAD EXAMPLE'}))
  await user.selectOptions(screen.getByLabelText('Queue 2 scheduling policy'),'PP')
  expect(screen.queryByLabelText('Queue 2 time quantum')).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Queue 2 demotion rule'),'service')
  await user.type(screen.getByLabelText('Queue 2 CPU service budget'),'3')
  expect(screen.getByLabelText('P1 burst time')).toHaveValue(12)
  expect(screen.getByLabelText('P1 priority')).toHaveValue(2)
  await user.click(screen.getByRole('button',{name:'RESET'}))
  expect(screen.getByLabelText('P1 burst time')).toHaveValue(null)
  await user.click(screen.getByRole('button',{name:'Undo input replacement'}))
  expect(screen.getByLabelText('P1 burst time')).toHaveValue(12)
  expect(screen.getByLabelText('P5 burst time')).toHaveValue(7)
  await user.selectOptions(screen.getByLabelText('Scheduling algorithm'),'SJF')
  expect(screen.getByLabelText('P1 burst time')).toHaveValue(12)
  const mobile=screen.getByRole('navigation',{name:'Primary mobile navigation'})
  expect(within(mobile).getByRole('link',{name:'Lessons'})).toHaveAttribute('href','/learn')
  await user.click(within(mobile).getByRole('button',{name:'More navigation'}))
  expect(screen.getByRole('dialog',{name:'Mobile navigation'})).toHaveAttribute('open')
}, 20000)
