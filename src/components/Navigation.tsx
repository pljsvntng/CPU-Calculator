import { NavLink } from 'react-router-dom'
import { BookOpen, ArrowUpRight } from 'lucide-react'
import { CrewAvatar } from './CrewAvatar'
import { navigation } from '../data/navigation'

export function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLink to="/" className="brand" aria-label="CPU Scheduling Lab home" onClick={onNavigate}>
    <span className="brand-icon"><CrewAvatar size={32} /></span>
    <span>CPU SCHEDULING<span className="brand-subtitle">LAB / MISSION CONTROL</span></span>
  </NavLink>
}

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <>
    <div className="ship-designation"><span className="status-dot" /><span className="mono">OS–05 / THE SCHEDULER</span></div>
    <p className="nav-label">SHIP NAVIGATION</p>
    <nav aria-label="Main navigation">{navigation.map(({ to, title, icon: Icon }) =>
      <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <Icon size={18} strokeWidth={1.7} aria-hidden="true" /><span>{title}</span>
      </NavLink>,
    )}</nav>
    <div className="sidebar-bottom">
      <div className="lecture-note"><BookOpen size={19} aria-hidden="true" /><p>MISSION BRIEFING<span>Operating Systems · 05</span></p></div>
      <NavLink to="/learn" onClick={onNavigate} className="sidebar-resource">Explore the concepts <ArrowUpRight size={15} aria-hidden="true" /></NavLink>
      <div className="sidebar-version"><span className="status-dot" /> Phase 6 · Training Academy<span className="mono">v0.1</span></div>
    </div>
  </>
}

