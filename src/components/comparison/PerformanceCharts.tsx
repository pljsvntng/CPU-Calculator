import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { SchedulingResult } from '../../types/scheduling'
import { comparisonMetrics } from '../../utils/comparisonEngine'
import { algorithms } from '../../data/algorithms'
const colors = ['#2563eb','#15803d','#f97316','#7c3aed','#dc2626','#0891b2','#a16207','#db2777']
export default memo(function PerformanceCharts({ results }: { results: SchedulingResult[] }) {
  return <div className="performance-chart-grid">{comparisonMetrics.map(([metric,label,unit])=><section className="panel training-panel" aria-label={`${label} chart`} key={metric}><h2>{label}</h2><p>{unit} · {results.map(r=>`${r.algorithm}: ${r.metrics[metric].toFixed(4)}`).join('; ')}</p><div style={{height:260,minWidth:0}}><ResponsiveContainer width="100%" height="100%"><BarChart data={results.map(r=>({algorithm:r.algorithm,value:r.metrics[metric]}))} accessibilityLayer><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="algorithm" tick={{fill:'var(--muted)',fontSize:11}}/><YAxis width={58} tick={{fill:'var(--muted)',fontSize:11}}/><Tooltip formatter={value=>[Number(value).toFixed(4),unit]}/><Bar dataKey="value" isAnimationActive={false}>{results.map(r=><Cell key={r.algorithm} fill={colors[algorithms.findIndex(a=>a.id===r.algorithm)]}/>)}</Bar></BarChart></ResponsiveContainer></div></section>)}</div>
})
