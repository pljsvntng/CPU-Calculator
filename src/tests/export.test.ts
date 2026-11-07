import { expect,it } from 'vitest'
import { csv,inputCsv,resultsCsv,comparisonCsv } from '../utils/csvExport'
import { buildReport } from '../utils/reportExport'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { executeSimulation } from '../services/simulationTask'
import { buildGanttSvg } from '../utils/ganttExport'
it('escapes CSV punctuation and guards spreadsheet formulas',()=>{expect(csv([['a,b','a"b','a\nb','=SUM(A1)']])).toBe('"a,b","a""b","a\nb","\'=SUM(A1)"')})
it('exports actual input, complete results and comparison numbers',()=>{const p=generatePracticeProblem({algorithm:'RR',difficulty:'easy'}),r=executeSimulation(p);expect(inputCsv(p)).toContain('"AT"');expect(resultsCsv(r)).toContain(String(r.processes[0].completionTime));expect(comparisonCsv([r])).toContain(String(r.metrics.averageWaitingTime))})
it('creates a real paginated PDF containing configuration, timeline and formulas',()=>{const p=generatePracticeProblem({algorithm:'MLFQ',difficulty:'hard'}),r=executeSimulation(p),pdf=buildReport([r,r],new Date('2026-11-03T00:00:00Z'));expect(pdf.getNumberOfPages()).toBeGreaterThan(3);const raw=pdf.output();expect(raw).toContain('%PDF-');expect(raw).toContain('MLFQ');expect(raw).toContain('Gantt chart');expect(raw).toContain('Waiting Time')})
it('exports actual SVG intervals and supports a shared comparison domain',()=>{const r=executeSimulation(generatePracticeProblem({algorithm:'FCFS',difficulty:'easy'}));const own=buildGanttSvg(r,1000),shared=buildGanttSvg(r,1000,r.metrics.observationEndTime*2);expect(own).toContain('P1');expect(shared).not.toBe(own);expect(shared).toContain('CPU execution timeline')})
