import { describe,expect,it,vi } from 'vitest'
import { render,screen } from '@testing-library/react'
import { parseStudentNumber,checkPracticeAnswers,emptyPracticeAnswers,checkGantt } from '../utils/answerChecker'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { executeSimulation } from '../services/simulationTask'
import { buildReport } from '../utils/reportExport'
import { readMissions } from '../utils/simulationStorage'
import { ComparisonOverview } from '../components/comparison/ComparisonOverview'
import { AppErrorBoundary } from '../components/AppErrorBoundary'
describe('final grading and resource regressions',()=>{
  it.each(['4.9999999999999999999999','5.000000000000000000001','9007199254740990.99'])('rejects rounded fractional integer spelling %s',raw=>expect(parseStudentNumber(raw,true).status).toBe('invalid'))
  it.each(['5','5.0','005.000',' 5.000 '])('retains equivalent exact integer spelling %s',raw=>expect(parseStudentNumber(raw,true)).toEqual({value:5,status:'valid'}))
  it('never awards process or Gantt credit after a fractional value rounds to the correct integer',()=>{
    const p={...generatePracticeProblem({algorithm:'FCFS',difficulty:'easy'}),processes:[{id:'P1',arrivalTime:0,burstTime:5,originalInputOrder:0}]},r=executeSimulation(p),a=emptyPracticeAnswers(p)
    a.processes.P1.completionTime='4.9999999999999999999999'
    expect(checkPracticeAnswers(p,a,r).items.find(i=>i.key==='P1.completionTime')?.status).toBe('invalid')
    a.segments=[{id:1,processId:'P1',start:'0',end:'4.9999999999999999999999'}]
    expect(checkGantt(p,a,r.segments).status).toBe('invalid')
  })
  it('rejects mixed-workload comparison reports',()=>{
    const a=generatePracticeProblem({algorithm:'FCFS',difficulty:'easy',seed:'a'}),b={...a,processes:a.processes.map((p,i)=>i? p:{...p,burstTime:p.burstTime+1})}
    expect(()=>buildReport([executeSimulation(a),executeSimulation(b)])).toThrow('same process workload')
  })
  it('keeps dense overview rendering bounded and provides a full-inspector path',()=>{
    const r=executeSimulation({config:{algorithm:'RR',quantum:1},processes:[{id:'P1',arrivalTime:0,burstTime:2001,originalInputOrder:0}]})
    expect(()=>buildReport([r])).toThrow('2,000')
    const {container}=render(<ComparisonOverview result={r} domainEnd={2001}/>)
    expect(container.querySelector('svg')).toBeNull();expect(screen.getByText(/2,001 unit intervals/)).toHaveTextContent('Inspect Timeline')
  })
  it('treats an empty persisted archive as corruption without overwriting it',()=>{let raw='';const loaded=readMissions({getItem:()=>raw});expect(loaded.warning).not.toBe('');expect(raw).toBe('');raw='[]';expect(readMissions({getItem:()=>raw}).warning).toBe('')})
  it('offers recovery for a rendering failure without clearing stored records',()=>{
    const error=vi.spyOn(console,'error').mockImplementation(()=>{})
    const Broken=()=>{throw Error('Synthetic render failure')}
    try{render(<AppErrorBoundary><Broken/></AppErrorBoundary>);expect(screen.getByRole('alert')).toHaveTextContent('saved missions and learning progress remain');expect(screen.getByRole('button',{name:'Reload workspace'})).toBeInTheDocument()}finally{error.mockRestore()}
  })
})
