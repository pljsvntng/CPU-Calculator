import { memo } from 'react'
import type { SchedulingResult } from '../../types/scheduling'
import { buildGanttSvg } from '../../utils/ganttExport'
export const ComparisonOverview = memo(function ComparisonOverview({ result, domainEnd }: { result: SchedulingResult; domainEnd: number }) {
  if(result.segments.length>2000) return <p className="training-notice">This schedule has {result.segments.length.toLocaleString()} intervals. Use Inspect Timeline below for the full scrollable chart and complete image exports.</p>
  return <div className="comparison-svg" dangerouslySetInnerHTML={{__html:buildGanttSvg(result,900,domainEnd)}}/>
})
