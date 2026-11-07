import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ChevronRight, CircleHelp, Menu, Moon, Sun, X, BookOpen, ArrowRight } from 'lucide-react'
import { Brand, Navigation } from '../components/Navigation'
import { navigation } from '../data/navigation'
import { applyTheme, getInitialTheme } from '../utils/theme'

export function AppLayout() {
  const location = useLocation()
  const title = navigation.find(item => item.to === location.pathname)?.title ?? 'Page not found'
  const [theme, setTheme] = useState(getInitialTheme)
  const drawer = useRef<HTMLDialogElement>(null)
  const help = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const initialLocation = useRef(location.pathname)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    document.title = `${title} · CPU Scheduling Lab`
    if (initialLocation.current !== location.pathname) {
      main.current?.focus()
      initialLocation.current = location.pathname
    }
  }, [location.pathname, title])

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar"><Brand /><Navigation /></aside>
    <dialog ref={drawer} className="nav-drawer" aria-label="Mobile navigation">
      <div className="drawer-heading"><Brand onNavigate={() => drawer.current?.close()} /><button className="icon-button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X size={21} /></button></div>
      <Navigation onNavigate={() => drawer.current?.close()} />
    </dialog>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu size={21} /></button>
          <span className="current-page">{location.pathname === '/' ? 'Mission Control' : title}</span>
          <span className="topbar-divider" />
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Workspace</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{title}</span></nav>
        </div>
        <div className="topbar-actions">
          <span className="course-label"><span className="status-dot" /> OS–05 <span className="mono">/ LEARNING DECK</span></span>
          <button className="icon-button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <button className="icon-button" title="Help" aria-label="Open help" onClick={() => help.current?.showModal()}><CircleHelp size={20} /></button>
        </div>
      </header>
      <main id="main-content" ref={main} tabIndex={-1} className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>CPU SCHEDULING LAB <span className="footer-dot">/</span> Your processes. Your mission.</span><span>LECTURE 05 <span className="footer-dot">/</span> INTERACTIVE SIMULATOR</span></footer>
    </div>
    <dialog ref={help} className="help-dialog" aria-labelledby="help-title">
      <div className="panel-heading"><h2 id="help-title">Your scheduling workspace</h2><button className="icon-button" aria-label="Close help" onClick={() => help.current?.close()}><X size={20} /></button></div>
      <div className="help-body"><BookOpen className="text-blue" size={28} aria-hidden="true" /><p>Start in the Learning Center to explore the eight algorithms from Lecture 5. Use the Calculator to choose an algorithm and prepare a process input draft.</p>
        <p>The simulator runs all eight verified scheduling policies and displays real process timings and metrics. Load a lecture example or prepare your own crew. The timeline supports event playback, ready-queue snapshots, zoom and image export. Select a process for exact formulas or open the Mission Execution Log for a synchronized walkthrough. Visit the Crewmate Academy for worked lessons and quizzes, or Training Missions to solve and check a problem. Use Compare Algorithms to run a shared dataset across policies. Mission Files exports reports and saves inputs; Mission Archive restores and recalculates them.</p>
        <Link className="button primary" to="/learn" onClick={() => help.current?.close()}>Open Learning Center <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </dialog>
  </div>
}


