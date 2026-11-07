import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { Algorithm } from '../types'
import { algorithms } from '../data/algorithms'
import { CrewAvatar } from './CrewAvatar'

export function AlgorithmCard({ algorithm }: { algorithm: Algorithm }) {
  return <Link to={`/learn?algorithm=${algorithm.id}`} className="algorithm-row">
    <span className="mission-avatar"><CrewAvatar processId={algorithms.findIndex(item => item.id === algorithm.id) + 1} size={30} /></span>
    <div><span className="module-code mono">{algorithm.id} <span>/ MISSION MODULE</span></span><h3>{algorithm.name}</h3><p>{algorithm.summary}</p></div>
    <ArrowUpRight className="algorithm-arrow" size={17} aria-hidden="true" />
  </Link>
}
